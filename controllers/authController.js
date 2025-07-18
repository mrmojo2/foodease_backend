import { StatusCodes } from "http-status-codes"
import HttpError from '../error/HttpError.js'
import jwt from 'jsonwebtoken'
import { attachCookieToResponse } from "../utils/jwt.js"
import pool from "../db/db.js"
import { create_user,get_user_by_username,get_user_by_id } from "../queries/userQueries.js"
import bcrypt from 'bcryptjs'


const register = async (req, res) => {
    const {username, password, user_type } = req.body

    if (!username || !password || !user_type) {
        throw new HttpError('please provide all values', StatusCodes.BAD_REQUEST)
    }

    const [check] = await pool.query(get_user_by_username,[username])
    if(check.length != 0){
        throw new HttpError('User with that name already exists!', StatusCodes.BAD_REQUEST)
    }

    const salt = await bcrypt.genSalt();
    const hashed_password = await bcrypt.hash(password, salt);

    let tokenUser = {};

    const [result] = await pool.query(create_user, [username,hashed_password,user_type]);

    const [rows] = await pool.query(get_user_by_username, username); //TODO: change this to get by result.insertId
    if (rows.length > 0) {
        const user = rows[0];
        tokenUser.username = user.username;
        tokenUser.role = user.role;
        tokenUser.user_type = user.user_type;
        tokenUser.userId = user.id;
        tokenUser.pfp_url = user.pfp_url
    }

    attachCookieToResponse({ res, user: tokenUser })

    res.status(StatusCodes.CREATED).json({ tokenUser })

}

const login = async (req, res) => {
    const { username, password } = req.body
    if (!username || !password) {
        throw new HttpError('please provide all values', StatusCodes.BAD_REQUEST)
    }

    const [user] = await pool.query(get_user_by_username,[username]);
    if (user.length == 0) {
        throw new HttpError('Couldn\'t find user with that name', StatusCodes.NOT_FOUND)
    }

    const isPasswordCorrect = await bcrypt.compare(password, user[0].password);
    if (!isPasswordCorrect) {
        throw new HttpError('invalid email or password', StatusCodes.UNAUTHORIZED)
    }

    const tokenUser = { username: user[0].username, role: user[0].role, userId: user[0].id,user_type:user[0].user_type,pfp_url:user[0].pfp_url }
    attachCookieToResponse({ res, user: tokenUser })

    res.status(StatusCodes.OK).json({ tokenUser })
}

const logout = async (req, res) => {
    res.cookie('token', 'logout', {
        httpOnly: true,
        sameSite: "None",
        secure: true,
        expires: new Date(Date.now())              //removing cookie from browser
    })
    res.json({ msg: 'logged out' })
}

const getLoginUser = async (req, res) => {
    // const user = await User.findOne({ _id: req.user.userId })
    const [user] = await pool.query(get_user_by_id,[req.user.userId])

    if (user.length == 0) {
        return res.status(StatusCodes.BAD_REQUEST)
    }
    res.status(200).json({ tokenUser: { ...req.user,user_type:user[0].user_type,pfp_url:user[0].pfp_url}})
}


export { login, register,logout,getLoginUser }