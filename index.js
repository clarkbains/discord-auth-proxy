const express = require('express')
const cookieParser = require('cookie-parser')
const fetch = require('node-fetch')
const cookieSession = require('cookie-session')
const NodeCache = require( "node-cache" );
const AuthCache = require("./cache")

const reqCache = new NodeCache({stdTTL: 3600});
const cookieCache = new NodeCache({stdTTL: 100});

const auth = new AuthCache()
const config = require('./config')
let crypto = require("crypto");

const API_BASE_URL='https://discord.com/api/v8'


let app = express()
app.use(express.urlencoded({extended: true}))
app.use(cookieParser())
app.use(cookieSession({secret: config.COOKIE_SIGNER, name:config.PROJECT_NAME+"-session",maxAge:1000*3600*1.5}))

app.use((req,res,next)=>{
	req.sessionOptions.domain = ""
	console.log(req.url)
	next()
})

app.get('/verify/:server', async (req,res)=>{
	try {
		let u = req.headers["x-forwarded-uri"]
		let names=req.headers[`x-${config.PROJECT_NAME}-allow-names`]?.split(/\s?,\s?/g) || []
		let ids=req.headers[`x-${config.PROJECT_NAME}-allow-ids`]?.split(/\s?,\s?/g) || []
		let domain = req.headers[`x-forwarded-host`]
		let server=req.params.server
		if (u.indexOf(`${config.PROJECT_NAME}.logout`) != -1){
			req.session = {}
			return res.status(401).send("You have been successfully signed out.")
		}

		if (u?.indexOf(`${config.PROJECT_NAME}.setAuthCookie`) !== -1 ){
			const urlParams = new URLSearchParams(u?.match(/^([^?]*)\?(.*)$/)?.[2]);
			const state = urlParams.get("state")
			console.log(`Got cookie set request on primary domain ${state}`, urlParams)
			const orig = reqCache.get(state)
			const cookieData = cookieCache.get(state)
			Object.assign(req.session, cookieData)
			res.redirect(orig.proto + "://" + orig.host + ":" + orig.port + orig.url)
			reqCache.del(state)
			cookieCache.del(state)
			return
		}

		if (req.session?.id){
			let p = await auth.getEntry(req.session.id, server)
			let nameSet = {}
			let idSet = {}
			let f = false
			for (let aname of names)	nameSet[aname] = 1
			for (let aid of ids)	idSet[aid] = 1
			let matching = []
			for (let rc of (p?.roles || [])){
				if (nameSet[rc[1]] || idSet[rc[0]]) matching.push(rc)
			}	

			//console.log("has", nameSet, idSet)
			//console.log("needs", p)
			//console.log("means", f)
			//console.log()
			if (domain !== req.session?.domain){
				return res.status(403).send("You have permission to view this resource, however the attached cookie was obtained by authenticating with a different site")
			} else if ((names.length + ids.length) == 0) {
				return res.status(403).send("Permissions have not been set on this domain")
			} else if (matching.length > 0) {
				let buff = new Buffer(JSON.stringify({
					id: req.session.id,
					sid: matching,
				}) );
				res.header(`X-${config.PROJECT_NAME}-User`, buff.toString('base64'))
				return res.status(200).end()
			} else {
				return res.status(401).send("You do not have permission to view this resource")
			}
		}
 
		let rid = crypto.randomBytes(20).toString('hex');
		reqCache.set(rid, {
			host: req.headers["x-forwarded-host"],
			proto: req.headers["x-forwarded-proto"],
			port: req.headers["x-forwarded-port"],
			url: req.headers["x-forwarded-uri"],
			randID: rid
		})
		//By redirecting to the main domain with some state information, we can set the cookie from the main domain, which avoids trying to set cross domain cookies.

		//console.log("Request Cache: ", reqCache.get(rid))
		req.session.rid = rid
		req.session.domain = domain

		res.status(302).header({Location: `${API_BASE_URL}/oauth2/authorize?client_id=${config.CLIENT_ID}&redirect_uri=https%3A%2F%2Foauth.cwdc.cbains.ca%2Fcallback&response_type=code&scope=identify&state=${rid}&prompt=none`}).end()
	} catch (e) {
		console.error(e)
		res.status(500).send("Auth Proxy: Error authenticating your identity")
	}
	
	
})


app.set('view-engine', 'ejs')
console.log("Init! ")


app.get('/health', (req,res)=>{
    res.status(200).end()
})
 
app.get('/boot-time', (req,res)=>{
	res.send("Started at " + new Date())
})
app.get('/callback', async (req,res)=>{
    const { code, state } = req.query;
	if (code) {
		try {
			const oauthResult = await fetch(`${API_BASE_URL}/oauth2/token`, {
				method: 'POST',
				body: new URLSearchParams({
					client_id: config.CLIENT_ID,
					client_secret: config.CLIENT_SECRET,
					code,
					grant_type: 'authorization_code',
					redirect_uri: `https://oauth.cwdc.cbains.ca/callback`,
					scope: 'identify',
				}),
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
				},
			});

			const oauthData = await oauthResult.json();
            let h = {'authorization': `${oauthData.token_type} ${oauthData.access_token}`}

			const self = await fetch(`https://discord.com/api/users/@me`, {headers: h})
            const selfData = await self.json()
			let orig = reqCache.get(state)
			if (state !== req.session.rid){
				//CSRF
				//throw new Error("CSRF state token mismatch. "+ state + ", expecting " + req.session.rid)
			}

			cookieCache.set(state, {
				id: selfData.id,
				username: selfData.username,
				disc: selfData.discriminator,
			})

			if (!orig){
				return res.status(500).send("Auth Proxy: Information about this request has been dropped from the cache. You are now signed in, please manually navigate to the site.")
			}

			res.redirect(orig.proto + "://" + orig.host + ":" + orig.port + `/${config.PROJECT_NAME}.setAuthCookie?state=${state}`)

		} catch (error) {
			res.status(500).send("Auth Proxy Error")
			console.error(error);
		}
	} 

})

app.use(function (err, req, res, next) {
	console.error(err.stack)
	res.status(500).json(err)
})


console.log(`Listening on ${config.PORT}`)
app.listen(config.PORT)
