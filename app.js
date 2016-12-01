const fs = require('fs');
var Twitter  = require('twitter');
var config = {
	max_count: 100,
};

const regex = [
	/\bchatbot\b/i,
	/\bchatbots\b/i,
	/\bbots\b/i,
	/\bbot\b/i,
	/\bbottomatik\b/i,
];

try{
	config = JSON.parse(fs.readFileSync('./config.json'));
} catch(e) {
	console.log('Error reading config', e);
}

const client = new Twitter({
	consumer_secret: config.consumer_secret,
	consumer_key: config.consumer_key,
	access_token_key: config.access_token,
	access_token_secret: config.access_secret
});

function getTimeline(callback){
	client.get('statuses/home_timeline.json', {count:config.max_count || 100}, function(err, tweets, res){
		if(err){
			return console.error(err);
		}
		if(tweets.length > 0){
			for(var tweet of tweets){
				if(tweet.user && tweet.user.followers_count > 1000){
					follow(tweet.user.id)
				}
				for(var reg of regex){
					if(reg.test(tweet.text) && tweet.user.screen_name !== 'bottomatik'){
						console.log(`Sending for retweet ${tweet.id} from ${tweet.user.screen_name}`);
						retweet(tweet);
						break;
					}
				}
			}
		}
	});
}

function getMentions(callback){
	var params = {count:config.max_count || 100};
	if(config.last_mention_id){
		params.since_id = config.last_mention_id
	}
	client.get('statuses/mentions_timeline.json', params, function(err, tweets, res){
		if(err){
			return console.error(err);
		}
		if(tweets.length > 0){
			config.last_mention_id = tweets[0].id;
			fs.writeFileSync('./config.json', JSON.stringify(config));
			for(var tweet of tweets){
				console.log(`Retweeting - ${tweet.id} - mention '${tweet.text}' from ${tweet.user.screen_name}`);
				retweet(tweet);
			}
		}
	});
}

function retweet(tweet){
	client.post(`statuses/retweet/${tweet.id_str}.json`, {id: tweet.id_str}, function(err, tweets, res){
		if(err){
			return console.error('Error retweeting',err);
		}
		console.log('Successful retweet');
	});
}

function follow(user_id){
	client.post('friendships/create.json', {user_id: user_id}, function(err, tweets, res){
		if(err){
			return console.error('Error following',err);
		}
		console.log('Successful Follow');
	});
}

function run(){
	getMentions();
	getTimeline();

	setInterval(function(){
		getMentions();
		getTimeline();
	}, 20 * 60 * 1000); // 20 minutes
}
run();
