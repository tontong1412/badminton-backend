import { Request, Response } from 'express'
import UserModel from '../../schema/user'
import tokenUtils from '../../utils/token'
import sendEmail from '../../utils/sendEmail'
import { MailContent, TokenPayload } from '../../type'
import config from '../../config'
import constants from '../../constants'

const forgotPassword = async(
  req: Request<unknown, unknown, {email: string}, unknown>,
  res: Response): Promise<void> => {
  const { email } = req.body
  const user = await UserModel.findOne({ email })

  if(!user){
    res.status(404).json({ message: 'User with this email does not exist' })
    return
  }

  const userPayload: TokenPayload = {
    id: user._id,
    email: user.email,
    playerID: user.playerID,
    role: user.role,
  }

  const token = tokenUtils.create(userPayload, config.ACCESS_SECRET, constants.TOKEN.EXPIRE_TIME.ACCESS)
  const encodedToken = Buffer.from(token, 'utf8').toString('base64url')

  if(!config.EMAIL.USER){
    console.error('EMAIL environment variable is not defined')
    throw new Error('Internal server error')
  }

  const mailContent: MailContent = {
    to: user.email,
    subject: 'Password Reset',
    text: `Click the link to reset your password: ${config.CLIENT.URL}/reset-password/${encodedToken}`,
  }

  await sendEmail(mailContent)
  res.status(200).send('Reset password link has been sent to your email')
}
export default forgotPassword
