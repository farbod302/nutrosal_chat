const express = require("express")
const cors = require("cors")
const https = require("https")
const fs = require("fs")
const app = express()
app.use(cors())
const bodyParser = require("body-parser")
app.use(bodyParser.json())
const api = require("./API")

const conf = {
    key: fs.readFileSync("/etc/letsencrypt/live/nutrostyle.nutrosal.com/privkey.pem"),
    cert: fs.readFileSync("/etc/letsencrypt/live/nutrostyle.nutrosal.com/fullchain.pem")
}
api.init(app)

app.post("/chat/webhook*", (req, res) => {
    const notifications_to_send = req.body.map(e => {
        const { data } = e
        const { sender, recipient, messages,conversation} = data
        console.log(messages);
        // const new_notification={
        //     title:conversation.subject,
        //     body:`${sender.name}: new notif`
        // }
        // const {pushTokens}=recipient

    })
})
const server = https.createServer(conf, app)
server.listen(4015, () => { console.log("server run on port 4015") })
