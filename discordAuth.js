const config = require('./config')
const { Client, Intents } = require('discord.js');

class BotAuth {
    client
    constructor (s) {
        this.client = new Client({ intents: [Intents.FLAGS.GUILDS] });
        this.client.login(config.DISCORD_TOKEN);
        this.client.on('ready', () => {
            this.client.user.setPresence({ activities: [{ name: 'your roles', type:'WATCHING' },{ name: 'data to my front end', type:'STREAMING' }], status: 'online' });
          });
       
    }


    async getForUser(id, gid){
        try {
            let g = await this.client.guilds.fetch({guild: gid})
            let u = await g.members.fetch({user:id, force:true})
            let name = u.nickname ?? `${u.user.username}#${u.user.discriminator}`
            return {roles: u.roles.cache.map((v,k)=>[v.id, v.name]), name, uid: id, gid}
        } catch (e) {
            console.error("Error while fetching role info", e)
            return {roles: [], name: "", uid: id, gid}
        }
    }
}

module.exports = BotAuth