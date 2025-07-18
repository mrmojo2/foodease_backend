import { StatusCodes } from "http-status-codes"
const errHandler = (error, req, res, next) => {
    console.log(error)
    const customError = {
        message: error.message || 'something went wrong..please try again later',
        statusCode: error?.statusCode || StatusCodes.INTERNAL_SERVER_ERROR
    }
    if (error.name === 'ValidationError') {
        customError.statusCode = StatusCodes.BAD_REQUEST
        customError.message = Object.values(error.errors).map(item => item.message).join(',')
    }
    if (error.code && error.code === 11000) {
        customError.statusCode = StatusCodes.BAD_REQUEST
        customError.message = `Value provided for ${Object.keys(error.keyValue)} already exists`
    }
    if (error.name === 'CastError') {
        customError.statusCode = StatusCodes.BAD_REQUEST
        customError.message = `invalid value for ${error.kind}`
    }
    // res.json({error})
    res.status(customError.statusCode).json({ msg: customError.message })
}

export default errHandler