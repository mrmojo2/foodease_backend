import { StatusCodes } from "http-status-codes"
import HttpError from "../error/HttpError.js"

const checkPermission = (requestUser, resourceUserId) => {
    if (requestUser.role === 'admin') return
    if (requestUser.userId === resourceUserId.toString()) return
    throw new HttpError('unauthorized', StatusCodes.UNAUTHORIZED)
}

export default checkPermission