const mongoose = require('mongoose')

const url = process.env.MONGO_URI

mongoose.connect(url)
  .then(result => { // eslint-disable-line no-unused-vars
    console.log('Connected to MongoDB')
  })
  .catch(err => {
    console.log('Error connecting to MongoDB: ', err)
  })

const treeSchema = new mongoose.Schema({
  name: {
    type: String,
    minLength: 3,
    required: true
  },
  user: {
    type: String,
    default: "unnamed"
  },
  numberPlanted: {
    type: String,
    minLength: 1,
  },
  location: {
    type: Object,
    required: true,
  },
  image: { data: Buffer, contentType: String },
  userId: {
    type: String,
    default: ""
  }
}, { timestamps: true })

const treeUpdateSchema = new mongoose.Schema({
  treeId: {
    type: String,
    required: true
  },
  user: {
    type: String,
    default: "unnamed"
  },
  text: {
    type: String,
    default: ""
  },
  image: { data: Buffer, contentType: String },
  userId: {
    type: String,
    default: ""
  }
}, { timestamps: true })

const userSchema = new mongoose.Schema({
  userName: {
    type: String,
    required: true,
  },
  userEmail: {
    type: String,
    required: true
  },
  passwordHash: {
    type: String,
    required: true
  },
  salt: String
})

treeSchema.set('toJSON', {
  transform: (document, returnedObject) => {
    returnedObject.id = returnedObject._id.toString()
    delete returnedObject._id
    delete returnedObject.__v
  }
})

treeUpdateSchema.set('toJSON', {
  transform: (document, returnedObject) => {
    returnedObject.id = returnedObject._id.toString()
    delete returnedObject._id
    delete returnedObject.__v
  }
})

userSchema.set('toJSON', {
  transform: (document, returnedObject) => {
    returnedObject.id = returnedObject._id.toString()
    delete returnedObject._id
    delete returnedObject.__v
  }
})

const Tree = mongoose.model('Tree', treeSchema)
const TreeUpdate = mongoose.model('TreeUpdate', treeUpdateSchema)
const User = mongoose.model('User', userSchema)

module.exports = { Tree, TreeUpdate, User }