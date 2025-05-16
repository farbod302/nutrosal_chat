const express = require("express")
const cors = require("cors")
const https = require("https")
const http = require("http")
const fs = require("fs")
require('dotenv').config()

const app = express()
app.use(cors())
const bodyParser = require("body-parser")
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ limit: "1024mb", extended: true }))

const api = require("./API")
const { default: axios } = require("axios")

const conf = {
    key: fs.readFileSync("/etc/letsencrypt/live/nutrostyle.nutrosal.com/privkey.pem"),
    cert: fs.readFileSync("/etc/letsencrypt/live/nutrostyle.nutrosal.com/fullchain.pem")
}
api.init(app)

const messages_history = {}

app.post("/chat/webhook*", (req, res) => {
    const { sender, recipient, messages, conversation } = req.body.data
    const { name } = recipient
    const { id } = messages[0]
    const { id: user_id } = recipient
    if (messages_history[user_id] && messages_history[user_id] === id) return
    messages_history[user_id] = id
    const mention = messages[0]?.text.indexOf(`@${name}`) > -1
    const to_all = messages[0]?.text.indexOf(`@all`) > -1
    const { content } = messages[0]
    let file = false
    if (content[0].type === "file") {
        const { subtype } = content[0]
        file = subtype
    }
    const { participants } = conversation
    const selected_user = participants[user_id]
    if (selected_user && !to_all) {
        const { notify } = selected_user
        if (!notify) return
        if (notify === "MentionsOnly" && !mention) return
    }
    const new_notification = {
        title: conversation.subject,
        body: `${sender.name} ${mention ? "Mention you" : ""}: ${!file ? (messages[0]?.text) || "New message" : `New ${file}`}`
    }
    const { pushTokens } = recipient
    const keys = Object.keys(pushTokens)
    const expo_tokens = keys.filter(e => e.indexOf("ExponentPushToken") > -1)
    if (!expo_tokens.length) return
    const selected_token = expo_tokens.at(0)
    const final_token = selected_token.replace("fcm:", "")
    send_notification(final_token, new_notification.title, new_notification.body, messages[0]?.conversationId)

})
const server = https.createServer(conf, app)
server.listen(4015, () => { console.log("server run on port 4015") })



const send_notification = (notification_token, title, body, group_id) => {
    if (!notification_token || !notification_token.startsWith("ExponentPushToken")) return null
    const notif = {
        body,
        title,
        sound: "default",
        to: notification_token,
        data: {
            redirect: "/chat/" + `${group_id || ""}`
        }
    }
    axios.post("https://api.expo.dev/v2/push/send", [notif])

}


const multer = require('multer');
const upload = multer({ dest: './uploads/' });
const { createTransport } = require("nodemailer") // npm i nodemailer
const config = {
    host: "smtp.sendgrid.com",
    port: 587,
    auth: {
        type: "login",
        user: "nutrosal-noreply@nutrosal.com",
        pass: process.env.EMAIL, // put it to .env
    },
    tls: {
        rejectUnauthorized: false
    }
}
const miler = createTransport(config);




app.post('/send-image', upload.single('files'), async (req, res) => {

    console.log(process.env.EMAIL);
    const email = req.body.email;
    const name = req.body.name;
    const imageFile = req.file;
    const code = req.code;
    if (!email || !imageFile) {
        return res.status(400).send('Missing email or image');
    }
    const mailOptions = {
        from: 'nutrosal-noreply@nutrosal.com',
        to: email,
        subject: `Congradulations ${name}! Your Nutrosal Fat Loss Discount Code Is Here!`,
        html: `
        <p>Hi ${name}</p>
        Thank you for stopping by our table at the event – it was great connecting with you!
        <br />
        <b>👉 CODE: ${code}</b>
        <br />
        <b>⏳ Offer expires in 30 days </b>
        <br />
        <b>✅ Valid for our 1-Month Plan only </b>
        <br />
        <br /> As promised, here’s your exclusive discount code for Nutrosal Fat Loss Services:<br /> <br /> 
        <img src="cid:unique-image-id" alt="Embedded Image" /><br /> <br /> 
        This is a great chance to kick-start your fat loss journey with a focused, results-driven plan.
        Got questions or ready to book? Email to support@nutrosal.com or visit nutrosal.com to learn more.
        <br />
        – The Nutrosal Team
      `,
        attachments: [
            {
                filename: imageFile.originalname,
                path: imageFile.path,
                cid: 'unique-image-id',
            },
        ],
    };

    try {
        await miler.sendMail(mailOptions)
        fs.unlinkSync(imageFile.path);
        res.send('Email sent successfully!');
    } catch (error) {
        console.error(error);
        res.status(500).send('Error sending email.');
    }
});