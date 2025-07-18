import nodemailer from 'nodemailer'
import jwt from 'jsonwebtoken'



const sendVerificationMail = async ({ email, name, password, user_type }) => {
    // You can encode user details into a JWT token to pass securely
    const token = jwt.sign({ name, email, password, user_type }, process.env.JWT_SECRET, { expiresIn: '1h' })

    // Generate the verification link with the token
    const verificationUrl = `${process.env.BASE_URL}/api/v1/auth/verify-email?token=${token}`

    const transporter = nodemailer.createTransport({
        host: 'smtp-relay.brevo.com',
        port: 587,
        secure:false,
        auth:{
            user: process.env.BREVO_LOGIN,
            pass: process.env.BREVO_SMTP_KEY
        },
        logger: true,  // Enable logging
        debug: true    // Enable debug output
    })
    try {
        // Send the verification email
        await transporter.sendMail({
            from: process.env.BREVO_LOGIN,
            to: email,
            subject: 'Verify your account',
            html: `
            <h1>Hi ${name},</h1>
            <p>Please verify your email by clicking the link below:</p>
            <a>Verify Email</a>
        `
        })
        console.log("mail sent successfully")
        
    } catch (error) {
        console.log(error)
    }

}

export default sendVerificationMail