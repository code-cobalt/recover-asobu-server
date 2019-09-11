require('dotenv').config()
const express = require('express')
const app = express()
//Port config
const port = process.env.PORT || 3000
//GraphQL
const graphqlHTTP = require('express-graphql')
import { execute, subscribe } from 'graphql'
import { createServer } from 'http'
import { SubscriptionServer } from 'subscriptions-transport-ws'
const subscribtionsEndpoint = `ws://localhost:${port}/subscriptions`
//Body Parser
const bodyParser = require('body-parser')
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())
//Multer/Cloudinary for Uploads
const multer = require('multer')
const cloudinary = require('cloudinary')
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_KEY,
  api_secret: process.env.CLOUD_SECRET
})
const cloudinaryStorage = require('multer-storage-cloudinary')
const storage = cloudinaryStorage({
  cloudinary,
  folder: 'demo',
  allowedFormats: ['jpg', 'png'],
  transformation: [{ width: 500, height: 500, crop: 'limit' }]
})
const parser = multer({ storage })
//Moment for Timestamps
const moment = require('moment')

//Mongoose for MongoDB queries
const mongoose = require('mongoose')
const schema = require('./server/schema.ts')
const root = require('./server/root.ts')
const { Seeder } = require('mongo-seeding')
//Path for static files
const path = require('path')
const User = require('./server/models/user')
//Bcrypt for hashing
const bcrypt = require('bcrypt')
//formatError for custom graphql resolver errors
import { formatError } from 'apollo-errors'

// setting useFindAndModify to false resolves MongoDB Node.js deprecation warnings from using certain Mongoose methods
// setting useCreateIndex true to allow unique constraint in user email
mongoose.connect(process.env.DB_URL, {
  useNewUrlParser: true,
  useFindAndModify: false,
  useCreateIndex: true
})

const db = mongoose.connection
db.once('open', () => console.log('Connected to DB'))

// const config = {
//   database: process.env.DB_URL,
//   dropDatabase: true
// }

// **DO NOT DELETE**
// NOTE: To avoid overages on our MongoDB/Cloudinary, please refrain from
// seeding, querying, and uploading too often!
// const seeder = new Seeder(config)
// const collections = seeder.readCollectionsFromPath(path.resolve('./data'))

// seeder
//   .import(collections)
//   .then(() => console.log('Successfully seeded database'))
//   .catch(err => console.log('Error seeding database', err))

app.use(
  '/graphql',
  graphqlHTTP({
    schema,
    rootValue: root,
    graphiql: true,
    subscribtionsEndpoint,
    formatError
  })
)

app.post('/upload', parser.single('image'), (req, res) => {
  interface UploadedImage {
    url: string
    id: string
  }
  const image = <UploadedImage>{
    url: req.file.url,
    id: req.fild.public_id
  }
  res.send(image)
})

//This is the websocket that wraps the server. A websocket is basically a live connection between server and client that are actively
//listening to each other.
const clients = []
const WebSocket = require('ws')
const wss = new WebSocket.Server({ port: 3001 })
const l0 = new RegExp(/l0/)
const m0 = new RegExp(/m0/)

wss.on('connection', ws => {
  ws.on('message', msg => {
    console.log(msg)
    if (l0.test(msg)) {
      const user = msg.split(' ')
      let isLogged = false
      for (const client of clients) {
        if (client.email === user[1]) {
          client.socket = ws
        }
      }
      for (const client of clients) {
        if (client.email === user[1]) isLogged = true
      }
      if (!isLogged) clients.push({ email: user[1], socket: ws })
      console.log(clients)
    }
    if (m0.test(msg)) {
      for (const client of clients) {
        client.socket.send('m0')
      }
    }
    for (const client of clients) {
      client.socket.send('m0')
    }
  })
})

const ws = createServer(app)
// const graphSocketPort = 3001
// const graphSocket = require('websocket').server
// const graphServer = createServer(app)
// graphServer.listen(graphSocketPort, () => {
//   console.log(`Listening on ${graphSocketPort}`)

//   graphServer.on('request', (request) => {
//     console.log('Incoming Request')
//   })

//   graphServer.on('connection', (connection) => {
//     console.log('Connection Established')
//     connection.on('message', (message) => console.log(message))
//   })

//   graphServer.on('open', (listener) => {
//     console.log('Listener Active')
//   })

//   new SubscriptionServer(
//     {
//       execute,
//       subscribe,
//       schema
//     },
//     {
//       server: graphServer,
//       path: '/subscriptions'
//     }
//   )
// })
// const graphSocketServer = new graphSocket({ httpServer: graphServer })

ws.listen(port, () => {
  ws.on('request', request => {
    console.log('Incoming Connection')
    // const connection = request.accept(null, request.origin)
  })
  ws.on('connection', connection => {
    console.log('Connected')
  })
  ws.on('listening', listener => {
    console.log('Listening')
  })
  ws.on('message', (message: string) => {
    console.log(message)
  })
  console.log(`Listening on ${port}`)
  new SubscriptionServer(
    {
      execute,
      subscribe,
      schema
    },
    {
      server: ws,
      path: '/subscriptions'
    }
  )
})

// app.listen(port, () => console.log(`Listening on ${port}`))

export = { db }
