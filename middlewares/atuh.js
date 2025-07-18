import { StatusCodes } from 'http-status-codes'
import HttpError from '../error/HttpError.js'
import jwt from 'jsonwebtoken'

const authenticateUser = async (req, res, next) => {
    const token = req.signedCookies.token
    if (!token) {
        throw new HttpError("Authentication Invalid", StatusCodes.UNAUTHORIZED)
    }
    try {
        const { name, role, userId } = await jwt.verify(token, process.env.JWT_SECRET)
        req.user = { name, role, userId }
        next()
    } catch (error) {
        console.log(error)
        throw new HttpError("Authentication Invalid", StatusCodes.UNAUTHORIZED)
    }
}

const authorizePermissions = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            throw new HttpError('You are not authorized to visit this route', StatusCodes.FORBIDDEN)
        }
        next()
    }
}

export { authenticateUser, authorizePermissions }