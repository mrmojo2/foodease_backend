import jwt from 'jsonwebtoken'

const createJWT = (payload) => {
    const token = jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_LIFE
    })
    return token
}


const attachCookieToResponse = ({ res, user }) => {
    const token = createJWT(user)

    res.cookie('token', token, {
        httpOnly: true,
        expires: new Date(Date.now() + (24 * 3600000)),     //cookie expires after 1 day just like our jwt
        secure: true,
        signed: true,
        sameSite: "None",
    })
}

export { attachCookieToResponse }