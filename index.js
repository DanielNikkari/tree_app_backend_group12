require('dotenv').config()
const express = require('express')
const morgan = require('morgan')
const { Tree, TreeUpdate, User } = require('./tree')
const cors = require('cors')
const multer = require('multer')
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

const app = express()

app.use(cors())
app.use(express.json())

morgan.token('data', function (req, res) { return JSON.stringify(req.body) })
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
  Tree.find({}).sort({createdAt: -1}).then(trees => {
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

app.get('/api/trees/userProfile/:id', (request, response, next) => {
  Tree.find({ userId: request.params.id }).then(userTrees => {
    response.json(userTrees)
  })
  .catch(error => next(error))
})

app.get('/api/trees/getupdates/:treeId', (request, response, next) => {
  TreeUpdate.find({ treeId: request.params.treeId }).sort({createdAt: -1}).then(treeUpdates => {
    response.json(treeUpdates)
  })
  .catch(error => next(error))
})

app.get('*', (req,res) =>{
  res.sendFile(path.join(__dirname+'/build/index.html'))
})

app.post('/api/trees', upload.single('image'), (request, response, next) => {
  
  if (!request.body.name) {
    return response.status(400).json({
      error: 'Name missing'
    })
  } else if (!request.body.numberPlanted) {
    return response.status(400).json({
      error: 'Number planted missing'
    })
  } else if (!request.body.latitude) {
    return response.status(400).json({
      error: 'Please, enter latitude'
    })
  } else if (!request.body.longitude) {
    return response.status(400).json({
      error: 'Please, enter longitude'
    })
  } else if (!request.file) {
    return response.status(400).json({
      error: 'Please, add an image of the tree'
    })
  }

  const treeToAdd = request.body
  const location = { latitude: treeToAdd.latitude, longitude: treeToAdd.longitude}

  const tree = new Tree({
    name: treeToAdd.name,
    user: treeToAdd.userName,
    numberPlanted: treeToAdd.numberPlanted,
    location: location,
    image: {
      data: fs.readFileSync(path.join(__dirname + '/uploads/' + request.file.filename)),
      contentType: request.file.mimetype,
    },
    userId: treeToAdd.userId
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

  if (!request.file) {
    return response.status(400).json({
      error: 'Please, add an image file'
  })
  }

  const treeUpdate = new TreeUpdate({
    treeId: request.params.id,
    user: request.body.userName,
    text: request.body.text,
    image: {
      data: fs.readFileSync(path.join(__dirname + '/uploads/' + request.file.filename)),
      contentType: request.file.mimetype,
    },
    userId: request.body.userId
  })

  treeUpdate.save().then(savedUpdate => {
    response.json(savedUpdate)
  })
  .catch(error => next(error))
})

app.post('/api/trees/registeruser', (request, response, next) => {

  const passwordHashing = hashPassword(request.body.password)
  // console.log(passwordHashing[0], passwordHashing[1])
  
  const newUser = new User({
    userName: request.body.name,
    userEmail: request.body.email,
    passwordHash: passwordHashing[0],
    salt: passwordHashing[1]
  })

  newUser.save().then(savedUser => {
    const userInfo = {
      userId: savedUser.id,
      userName: savedUser.userName,
    }
    response.json(userInfo)
  })
  .catch(error => next(error))
})

app.post('/api/trees/login', (request, response, next) => {
  User.find({ userEmail: request.body.email }).then(user => {
    if (user.length > 0) {
      if(validPassword(request.body.password, user[0].passwordHash, user[0].salt)) {
        const userInfo = {
          userId: user[0].id,
          userName: user[0].userName,
        }
        response.json(userInfo)
      } else {
        response.status(401)
        response.send("wrong password")
      }
    } else {
      response.status(401)
      response.send("wrong email")
    }
  })
})

app.delete('/api/trees/:id', (request, response, next) => {

  Tree.findByIdAndRemove(request.params.id).then(result => {
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

hashPassword = (password) => {
  // Creating a unique salt for a particular user
  const salt = crypto.randomBytes(16).toString('hex')
  
  // Hashing user's salt and password with 1000 iterations
  const passwordHash = crypto.pbkdf2Sync(password, salt,  
  1000, 64, `sha512`).toString(`hex`)

  console.log("passwordHash", passwordHash)
  console.log("salt", salt)

  return [passwordHash, salt]
}

validPassword = (password, hashedPassword, salt) => { 
  let hash = crypto.pbkdf2Sync(password, salt, 1000, 64, `sha512`).toString(`hex`)
  return hashedPassword === hash
}; 

const PORT = process.env.PORT || 8080

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`)
})