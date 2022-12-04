require('dotenv').config()
const express = require('express')
const morgan = require('morgan')
const { Tree, TreeUpdate } = require('./tree')
const cors = require('cors')
const multer = require('multer')
const fs = require('fs')
const path = require('path')

const app = express()

app.use(cors())
app.use(express.json())

morgan.token('data', function (req, res) { return JSON.stringify(req.body) }) // eslint-disable-line no-unused-vars
morgan(function (tokens, req, res) {
  return [
    tokens.method(req, res),
    tokens.url(req, res),
    tokens.status(req, res),
    tokens['response-time'](req, res), 'ms',
    tokens.data(req, res)
  ].join(' ')
})
app.use(morgan(':method :url :status :res[content-length] - :response-time ms :data'))

app.use(express.static('build'))

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
      cb(null, 'uploads')
  },
  filename: (req, file, cb) => {
      cb(null, file.fieldname + '-' + Date.now())
  }
});

const upload = multer({ storage: storage })


app.get('/api/trees', (request, response) => {
  console.log("Tree", Tree)
  Tree.find({}).then(trees => {
  // response.json(trees)
    response.json(trees)
  })
})

app.get('/info', (request, response) => {
  
  Tree.find({}).then(trees => {
    const treeDbSize = trees.length
    response.end(
      `The tree database has info for ${treeDbSize} trees\n${Date()}`
    )
  })
})

app.get('/api/trees/:id', (request, response, next) => {
  Tree.findById(request.params.id).then(trees => {
    response.json(trees)
  })
    .catch(error => next(error))
})

app.post('/api/trees', upload.single('image'), (request, response, next) => {
  if (!request.body.name) {
    return response.status(400).json({
      error: 'name missing'
    })
  } else if (!request.body.numberPlanted) {
    return response.status(400).json({
      error: 'number planted missing'
    })
  }

  const treeToAdd = request.body
  console.log(request.body)
  const location = { latitude: treeToAdd.latitude, longitude: treeToAdd.longitude}

  console.log(request.file)

  const tree = new Tree({
    name: treeToAdd.name,
    number: treeToAdd.number,
    location: location,
    image: {
      data: fs.readFileSync(path.join(__dirname + '/uploads/' + request.file.filename)),
      contentType: request.file.mimetype,
  }
  })

  tree.save().then(savedTree => {
    response.json(savedTree)
  })
    .catch(error => {
      next(error)
    })
  
})

app.post('/api/trees/:id/update', upload.single('image'), (request, response, next) => {

  console.log("id", request.params.id)

  const treeUpdate = new TreeUpdate({
    treeId: request.params.id,
    user: request.body.user,
    text: request.body.text,
    image: {
      data: fs.readFileSync(path.join(__dirname + '/uploads/' + request.file.filename)),
      contentType: request.file.mimetype,
    }
  })

  treeUpdate.save().then(savedUpdate => {
    response.json(savedUpdate)
  })
  .catch(error => {
    next(error)
  })
})

app.delete('/api/trees/:id', (request, response, next) => {

  Tree.findByIdAndRemove(request.params.id).then(result => { // eslint-disable-line no-unused-vars
    response.status(204).end()
  })
    .catch(error => {
      next(error)
    })
})

app.put('/api/trees/:id', (request, response, next) => {
  const body = request.body

  const person = {
    name: body.name,
    number: body.number,
    location: body.location,
    image: body.img,
  }

  Tree.findByIdAndUpdate(request.params.id, tree, { new: true, runValidators: true, context: 'query' })
    .then(updateTree => {
      response.json(updateTree)
    })
    .catch(error => next(error))
})

app.get('/api/trees/getupdates/:treeId', (request, response, next) => {
  TreeUpdate.find({ treeId: request.params.treeId }).then(treeUpdates => {
    response.json(treeUpdates)
  })
  .catch(error => next(error))
})

app.get('*', (req,res) =>{
  res.sendFile(path.join(__dirname+'/build/index.html'));
});

// const unknownEndpoint = (request, response) => {
//   response.status(404).send({ error: 'unknown endpoint' })
// }

// app.use(unknownEndpoint)

const errorHandler = (error, request, response, next) => {
  console.log(error.message)

  if (error.name === 'CastError') {
    return response.status(400).send({ error: 'malformatted id' })
  } else {
    response.status(500).send({ error: `Something went wrong: ${error}}` })
  }

  next(error)
}

app.use(errorHandler)

const PORT = process.env.PORT || 8080

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`)
})