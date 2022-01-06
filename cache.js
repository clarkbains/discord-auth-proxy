const AuthBot = require('./discordAuth')
const bot = new AuthBot()
function getUsr(abResp){
    return `${abResp.username} (${abResp.uid}::${abResp.gid})`
}
class UserCache {

    lookupCache;
    data;

    constructor (){
        this.data = {}
        setInterval(this.cleanup.bind(this), 1000*100)
    }
    
    async getEntry(userid, guildid){
        let id = guildid + "::" + userid
        let r = this.data[id];

        if (r){
            this.scheduleUpdate(r)
            return r
        } 

        let res = await bot.getForUser(userid, guildid)
        let e = new GuildUser(res)
        this.addEntry(id, e)
        return e
    }

    async scheduleUpdate(entry){
        if ((new Date()).getTime() -  (entry.updateQueuedAt).getTime() > 20*1000){
            entry.updateQueuedAt = new Date()
            console.log(`Data for ${getUsr(entry)} is stale. Queuing update`)
            let res = await bot.getForUser(entry.uid, entry.gid)
            let e = new GuildUser(res)
            this.addEntry(entry.gid + "::" + entry.uid, e)
        }
    }

    addEntry(id, entry){
        this.data[id] = entry
        console.log(`Got new data for ${getUsr(entry)}`)
    }

    cleanup(){
        let cTime = (new Date()).getTime()
        for (let key of Object.keys(this.data)){
            if (cTime - (this.data[key].retrievedAt.getTime()) > 60*1000 ){
                console.log(`Evicting ${getUsr(this.data[key])} from cache`)
                delete this.data[key]
            }
        }
    }
}

class GuildUser {
    username = ""
    uid = ""
    gid = ""
    roles = []
    retrievedAt = new Date()
    updateQueuedAt = new Date()
    constructor (abres){
        this.username = abres.name
        this.roles = abres.roles
        this.uid = abres.uid
        this.gid = abres.gid
    }
}
module.exports = UserCache