const mongoose = require('mongoose')

const url = process.env.MONGO_URI

console.log(`Connecting to ${url}`)

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
    validate: {
      validator: (v) => {
        if (!Number.isInteger(v)) {
          return false
        }
        return true
      },
      message: (props) => { // eslint-disable-line no-unused-vars
        return 'The amount planted has to be positive whole numbers'
      }
    }
  },
  location: {
    type: Object,
    required: true,
  },
  image: { data: Buffer, contentType: String },
}, { timestamps: true })

treeSchema.set('toJSON', {
  transform: (document, returnedObject) => {
    returnedObject.id = returnedObject._id.toString()
    delete returnedObject._id
    delete returnedObject.__v
  }
})

module.exports = mongoose.model('Tree', treeSchema)