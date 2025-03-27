import nodemailer from 'nodemailer'
import CONFIG from '../config'
import { MailContent, MailOptions } from '../type'

const sendEmail = async(mailContent: MailContent) => {

  if(!CONFIG.EMAIL.USER || !CONFIG.EMAIL.PASSWORD){
    console.error('Missing email credentials')
    return
  }
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: CONFIG.EMAIL.USER,
      pass: CONFIG.EMAIL.PASSWORD,
    },
  })

  const mailOptions: MailOptions = {
    from :{
      name: 'Badminstar',
      address: CONFIG.EMAIL.USER
    },
    ...mailContent
  }

  try {
    const info = await transporter.sendMail(mailOptions)
    console.log('Email sent:', info.messageId)
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error sending email:', error.message)
    } else {
      console.error('Unknown error:', error)
    }
    throw new Error('Failed to send email')
  }

}

export default sendEmail