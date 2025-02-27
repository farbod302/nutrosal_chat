const express = require("express")
const cors = require("cors")
const https = require("https")
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
    const { content } = messages[0]
    let file = false
    if (content[0].type === "file") {
        const { subtype } = content[0]
        file = subtype
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