const express = require("express")
const cors = require("cors")
const https = require("https")
const fs = require("fs")
const app = express()
app.use(cors())
const bodyParser = require("body-parser")
app.use(bodyParser.json())
const api = require("./API")
const { default: axios } = require("axios")

const conf = {
    key: fs.readFileSync("/etc/letsencrypt/live/nutrostyle.nutrosal.com/privkey.pem"),
    cert: fs.readFileSync("/etc/letsencrypt/live/nutrostyle.nutrosal.com/fullchain.pem")
}
api.init(app)

app.post("/chat/webhook*", (req, res) => {
    const { sender, recipient, messages, conversation } = req.body.data
    const { name } = recipient

    const mention = messages[0]?.text.indexOf(`@${name}`) > -1
    const { content } = messages[0]
    console.log(content[0].children);
    const new_notification = {
        title: conversation.subject,
        body: `${sender.name} ${mention ? "Mention you" : ""}: ${content[0]?.type === "text"? (messages[0]?.text) || "New message" : content[0]?.type}`
    }
    const { pushTokens } = recipient
    const keys = Object.keys(pushTokens)
    const expo_tokens = keys.filter(e => e.indexOf("ExponentPushToken") > -1)
    if (!expo_tokens.length) return
    const selected_token = expo_tokens.at(-1)
    const final_token = selected_token.replace("fcm:", "")
    send_notification(final_token, new_notification.title, new_notification.body)

})
const server = https.createServer(conf, app)
server.listen(4015, () => { console.log("server run on port 4015") })



const send_notification = (notification_token, title, body) => {
    if (!notification_token || !notification_token.startsWith("ExponentPushToken")) return null
    const notif = {
        body,
        title,
        sound: "default",
        to: notification_token,
        data: {
            redirect: "/chat"
        }
    }
    axios.post("https://api.expo.dev/v2/push/send", [notif])

}