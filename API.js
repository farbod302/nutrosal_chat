const axios = require("axios");
const jwt = require("jsonwebtoken");
const multer = require("multer")
const { Worker } = require('worker_threads');

const fs = require("fs");
const { uid } = require("uid");
const progress = require("./progress");
const API = {
    async init(app) {
        const SECRET_KEY = process.env.SECRET_KEY;
        const get_token = () => {
            const encoded_jwt = jwt.sign({ tokenType: 'app' }, SECRET_KEY, {
                issuer: 'thdsgPM5',
                expiresIn: '59s',
            });
            return encoded_jwt;
        };

        const request = async (method, path, body) => {
            method = method.toLowerCase()
            try {
                const token = `Bearer ${get_token()}`;
                const url = `https://api.talkjs.com/v1/thdsgPM5/${path}`;
                const config = {
                    headers: {
                        "Authorization": token,
                    },
                };

                const single_methods = ["get", "delete"];
                if (single_methods.includes(method)) {
                    const { data } = await axios[method](url, config);
                    return data;
                } else {
                    const { data } = await axios[method](url, body, config);
                    return data;
                }
            } catch (error) {
                console.error(`Error in ${method.toUpperCase()} ${path}:`, error.message);
                console.log(error.data);
                throw new Error("failed")
            }
        };

        this.server_request = async function (method, path, body) {
            try {
                const data = await request(method, path, body);
                return { status: true, data };
            } catch (err) {
                console.error("Server request failed:", err);
                return { status: false, msg: err.message };
            }
        };

        app.post("/chat/createGroup", this.create_group);
        app.post("/chat/createUser", this.create_user);
        app.post("/chat/deleteUser", this.delete_user);
        app.post("/chat/updateUser", this.update_user);
        app.post("/chat/moveUser", this.move_user_from_group);
        app.post("/chat/editGroup", this.edit_group);
        app.post("/chat/addMember", API.addMemberToGroup);
        app.post("/chat/removeMember", API.deleteMemberFromGroup);
        app.post("/chat/getGroup", this.get_group);
        app.post("/chat/getConversation", API.get_conversation);
        app.post("/chat/getUserConversation", this.get_user_conversation);
        app.post("/chat/getUnreadMessages", this.get_user_unread_messages);
        app.post("/chat/getUnreadMessagesAdmin", this.get_admin_unread_messages);
        app.post("/chat/addMultiUserToGroup", this.addMultiUserToGroup);
        app.post("/chat/deleteMultiUserFromGroup", this.deleteMultiUserFromGroup);
        app.get("/chat/getAllConversations", this.get_all_conversations);
        app.post("/chat/deleteConversation", this.delete_conversation);
        app.get("/chat/getAllUsers", this.get_all_users);
        app.post("/chat/getLastMessage", this.get_last_message);
        app.post("/chat/sendSystemMessage", this.send_system_message);
        app.post("/chat/sendUserMessage", this.send_user_message);
        app.get("/chat/getMessageInfo/:group_id/:message_id", this.get_message_info);
        app.post("/chat/upload", multer({ dest: `${__dirname}/uploads` }).single("file"), this.upload_file);
        app.post("/chat/videoUpload", multer({ dest: `${__dirname}/uploads` }).single("file"), this.upload_video);
        app.get("/chat/getUploadProgress/:upload_id", this.get_progress);
        app.post("/chat/muteNotification", this.muteNotification);
    },

    get_progress(req, res) {
        const { upload_id } = req.params
        const json_raw = fs.readFileSync("./progress.json")
        const json_string = json_raw.toString()
        const json = JSON.parse(json_string)
        console.log({ json, upload_id });
        const selected = json[upload_id]
        res.json(selected || 0)
    },

    async create_group(req, res) {
        try {
            const { name, group_id, admin_id } = req.body;
            if (!name || !group_id) {
                res.json({ status: false, msg: "Bad request" });
                return;
            }
            const participants = ["1"]
            if (admin_id) {
                participants.push(`${admin_id}`)
            }
            const groupData = {
                participants,
                subject: name,
                welcomeMessages: null,
                photoUrl: "https://style.nutrosal.com/logo.png",
            };
            const result = await API.server_request("PUT", `conversations/${group_id}`, groupData);
            res.json(result);
        } catch (err) {
            console.error("Error in create_group:", err.message);
            res.json({ status: false, msg: err.message });
        }
    },

    async create_user(req, res) {
        try {
            const { name, id } = req.body;
            const { status } = await API.server_request(
                "POST",
                `users/${id}`,
                {
                    name,
                    role: "default",
                    photoUrl: `https://d3h0betsped0eh.cloudfront.net/${id}/profile.png`,
                }
            );
            if (!status) throw new Error("User Already exist")
            if (res) res.json({ status: true, msg: "Created successfully" });
        } catch (err) {
            console.error("Error in create_user:", err.message);
            if (res) res.json({ status: false, msg: err.message });
        }
    },
    async delete_user(req, res) {
        try {
            const { id } = req.body;
            const result = await API.server_request(
                "DELETE",
                `users/${id}`,
            );
            res.json(result);
        } catch (err) {
            console.error("Error in delete_user:", err.message);
            res.json({ status: false, msg: err.message });
        }
    },

    async get_all_users(req, res) {
        let temp = []
        let all_users = []
        let { data: conversation } = await API.server_request("GET", `users?limit=100`);
        const { data } = conversation
        temp = data
        all_users = data
        while (temp.length) {
            const { data: conversation } = await API.server_request("GET", `users?limit=100&startingAfter=${temp.at(-1)?.id}`);
            temp = conversation.data
            all_users = all_users.concat(conversation.data)
        }
        res.json(all_users)
    },

    async delete_conversation(req, res) {
        const { conversation_id } = req.body
        const result = await API.server_request(
            "DELETE",
            `conversations/${conversation_id}`
        )
        res.json(result)
    },

    async update_user(req, res) {
        try {
            const { name, avatar, id } = req.body;
            const body = {};
            if (name) body.name = name;
            if (avatar) body.avatar = avatar;
            const result = await API.server_request("PUT", `users/${id}`, body);
            res.json(result);
        } catch (err) {
            console.error("Error in update_user:", err.message);
            res.json({ status: false, msg: err.message });
        }
    },

    async get_group(req, res) {
        try {
            const { group_id } = req.body;
            const group = await API.server_request("GET", `conversations/${group_id}`);
            res.json(group);
        } catch (err) {
            console.error("Error in get_group:", err.message);
            res.json({ status: false, msg: err.message });
        }
    },

    async get_conversation(req, res) {
        try {
            const { group_id } = req.body;
            console.log({ group_id });
            const conversation = await API.server_request("GET", `conversations/${group_id}/messages?limit=100`);
            if (res) res.json(conversation);
            return conversation
        } catch (err) {
            console.error("Error in get_conversation:", err.message);
            res.json({ status: false, msg: err.message });
        }
    },

    async get_all_conversations(req, res) {
        try {
            const conversations = await API.server_request("GET", `conversations`);
            res.json(conversations);
        } catch (err) {
            console.error("Error in get_all_conversations:", err.message);
            res.json({ status: false, msg: err.message });
        }


    },

    async get_user_conversation(req, res) {
        try {
            let temp = []
            let all_conversations = []
            const { user_id } = req.body;
            const conversation = await API.server_request("GET", `users/${user_id}/conversations`);
            temp = conversation
            all_conversations = conversation
            while (temp.length) {
                const conversation = await API.server_request("GET", `users/${user_id}/conversations?startingAfter=${temp.at(-1)?.id}`);
                temp = conversation
                all_conversations = all_conversations.concat(conversation)
            }
            if (res) res.json(conversation);
            return conversation
        } catch (err) {
            console.error("Error in get_user_conversation:", err.message);
            if (res) res.json({ status: false, msg: err.message });
        }
    },

    async get_user_unread_messages(req, res) {
        try {
            const { user_name, group_id, user_id } = req.body;
            const { data: group_messages } = await API.get_conversation({ body: { group_id } });
            const messages = group_messages.data;
            const unread = messages.filter(e => !e.readBy.includes(user_id) && e.senderId !== user_id);
            const mention = unread.some(e => e.text.toLowerCase().includes(`@${user_name.toLowerCase()}`));
            res.json({ unread: unread.length, mention });
        } catch (err) {
            console.error("Error in get_user_unread_messages:", err.message);
            res.json({ unread: 0, mention: false });
        }
    },

    async move_user_from_group(req, res) {
        try {
            const { id, cur_group, new_group } = req.body;
            await API.deleteMemberFromGroup({ body: { group_id: cur_group, user_id: id } });
            await API.addMemberToGroup({ body: { group_id: new_group, user_id: id } });
            res.json({ status: true, msg: "Success", data: { cur_group, new_group } });
        } catch (err) {
            console.error("Error in move_user_from_group:", err.message);
            res.json({ status: false, msg: err.message });
        }
    },

    async edit_group(req, res) {
        try {
            const { name, avatar, group_id, admin_id, old_admin } = req.body;
            if (!name || !group_id) {
                res.json({ status: false, msg: "Bad request" });
                return;
            }
            const icon = avatar || "https://nutrosalfront.netlify.app/logo.png";
            const groupData = {
                subject: name,
                type: "private",
                photoUrl: icon,
            };
            const result = await API.server_request("PUT", `conversations/${group_id}`, groupData);
            if (admin_id !== old_admin) {
                if (old_admin !== 1) {
                    API.deleteMemberFromGroup({ body: { group_id, user_id: old_admin } })
                }
                API.addMemberToGroup({ body: { group_id, user_id: admin_id } })
            }
            res.json(result);
        } catch (err) {
            console.error("Error in edit_group:", err.message);
            res.json({ status: false, msg: err.message });
        }
    },

    async addMemberToGroup(req, res) {
        try {
            const { group_id, user_id } = req.body;
            if (!user_id || !group_id || group_id === -1) {
                if (res) res.json({ status: false, msg: "Bad request" });
                return;
            }
            const result = await API.server_request("PUT", `conversations/${group_id}/participants/${user_id}`, { notify: true, access: "ReadWrite" });
            if (res) res.json(result);
        } catch (err) {
            console.error("Error in addMemberToGroup:", err.message);
            if (res) res.json({ status: false, msg: err.message });
        }
    },

    async deleteMemberFromGroup(req, res) {
        try {
            const { group_id, user_id } = req.body;
            const result = await API.server_request("DELETE", `conversations/${group_id}/participants/${user_id}`);
            if (res) res.json(result);
        } catch (err) {
            console.error("Error in deleteMemberFromGroup:", err.message);
            if (res) res.json({ status: false, msg: err.message });
        }
    },
    async get_admin_unread_messages(req, res) {
        const { user_id } = req.body
        const { data: conversations } = await API.get_user_conversation({ body: { user_id } })
        if (!conversations) return { unread: 0, mention: false }
        let unread = 0
        conversations?.data.forEach(conversation => {
            const { unreadMessageCount } = conversation
            unread += unreadMessageCount
        });
        res.json({ unread, mention: false })
    },

    async deleteMultiUserFromGroup(req, res) {
        try {
            const { members } = req.body
            console.log({ members });
            for (const user of members) {
                if (!user.group_id) continue
                await API.deleteMemberFromGroup({ body: { group_id: user.group_id, user_id: user.id } })
            }
            res.json({ status: true, msg: "", data: {} })
        } catch (err) {
            console.log(err);
            res.json({ status: false, msg: "", data: {} })

        }
    },
    async addMultiUserToGroup(req, res) {
        try {
            const { members } = req.body
            for (const user of members) {
                await API.addMemberToGroup({ body: { group_id: user.group_id, user_id: user.id } })
            }
            res.json({ status: true, msg: "", data: {} })
        } catch (err) {
            console.log(err);
            res.json({ status: false, msg: "", data: {} })
        }
    },
    async get_last_message(req, res) {
        const { user_id, group_id } = req.body
        const result = await API.server_request("GET", `conversations/${group_id}/messages?limit=100`)
        const message = result.data.data.reverse().find(e => !e.readBy.includes(`${user_id}`) && e.senderId !== `${user_id}`)
        res.json({ message_id: message?.id || null })
    },
    async get_message_info(req, res) {
        const { message_id, group_id } = req.params
        const result = await API.server_request("GET", `conversations/${group_id}/messages/${message_id}`)
        res.json(result.data)

    },
    async send_system_message(req, res) {
        const { text, image, group_id, custom } = req.body
        const body = []
        if (image) {
            body.push({
                attachmentToken: image,
                "type": "SystemMessage",
            })
        }
        if (text) {
            const data = {
                "text": text,
                "type": "SystemMessage",
            }
            data.custom = custom
            body.push(data)
        }


        API.server_request("POST", `/conversations/${group_id}/messages`, body)
        res.json(true)
    },
    async send_user_message(req, res) {
        const { text, image, group_id, custom, id } = req.body
        const body = []
        if (image) {
            body.push({
                attachmentToken: image,
                "type": "UserMessage",
                sender: `${id}`
            })
        }
        if (text) {
            const data = {
                "text": text,
                "type": "UserMessage",
                sender: `${id}`
            }
            data.custom = custom
            body.push(data)
        }


        API.server_request("POST", `/conversations/${group_id}/messages`, body)
        res.json(true)
    },
    async upload_file(req, res) {
        const file = req.file
        if (!file) {
            res.json(false)
            return
        }
        const form_data = new FormData()
        const file_self = await fs.openAsBlob(file.path)
        const file_to_send = new File([file_self], file.originalname)
        form_data.append("file", file_to_send)
        form_data.append("filename", file.originalname)
        const response = await API.server_request("POST", `/files`, form_data)
        res.json(response)
    },
    async upload_video(req, res) {
        const input = req.file
        const id = uid(8)
        const { upload_id } = req.body
        const output_path = `${__dirname}/uploads/${id}.mp4`
        const { path } = input
        const worker = new Worker("./worker.js", { workerData: { inputFilePath: path, outputFilePath: output_path, upload_id } })
        worker.on("message", async (msg) => {
            const { status } = msg
            if (status === "error") {
                res.json({ status: false })
                return
            }
            const form_data = new FormData()
            const file_self = await fs.openAsBlob(output_path)
            const file_to_send = new File([file_self], `${id}.mp4`, { type: "video/mp4" })
            form_data.append("file", file_to_send)
            form_data.append("filename", `${id}.mp4`)
            const response = await API.server_request("POST", `/files`, form_data)
            res.json(response)
        })


    },
    async muteNotification(req, res) {
        try {
            const { chat_id, user_id, new_status } = req.body
            const result = await API.server_request("PUT", `conversations/${chat_id}/participants/${user_id}`, { notify: new_status, access: "ReadWrite" });
            res.json(result)
        } catch {
            res.json(false)
        }

    }
}


module.exports = API;
