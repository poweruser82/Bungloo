define([
	"helper/HostApp",
	"helper/Core",
	"helper/APICalls",
	"lib/URI",
	"controller/Timeline"
],

function(HostApp, Core, APICalls, URI, Timeline) {


	function Profile() {

		Timeline.call(this);
		clearTimeout(this.reloadIntervall); // FIXME: reload for new data instead

		this.action = "profile";

		this.container = document.createElement("div");
		this.container.className = this.action;
		document.getElementById("content").appendChild(this.container);

		this.initProfileTemplate();
		this.hide();
	}

	Profile.prototype = Object.create(Timeline.prototype);
	

	Profile.prototype.show = function() {
		Core.prototype.show.call(this, this.container);
	}

	Profile.prototype.hide = function() {
		Core.prototype.hide.call(this, this.container);
	}

	Profile.prototype.logout = function() {
		this.container = "";
	}

	Profile.prototype.showList = function(list) {
		$(this.body).hide();
		$(this.followingsBody).hide();
		$(this.followersBody).hide();
		$(list).show();
	}

	Profile.prototype.showEntity = function(a, i) {
		var entity = $(a).closest("li").get(0).status.mentions[i].entity;
		this.showProfileForEntity(entity);
		bungloo.sidebar.onEntityProfile();
	};

	Profile.prototype.showProfileForEntity = function(entity) {

		if (!entity) {
			entity = HostApp.stringForKey("entity");
		}

		this.clear();
		this.entity = entity;
		this.following = null;
		this.following_id = null;
		this.profile_template.entity.innerHTML = this.entity;
		this.profile_template.entity.href = this.entity;

		this.getProfile();
		this.getFollowing();
		this.getStatuses();
	}

	Profile.prototype.initProfileTemplate = function() {

		var _this = this;

		var header = document.createElement("header");
		header.className = "profile";

		this.container.appendChild(header);

		this.profile_template = {
			avatar: document.createElement("img"),
			name: document.createElement("h1"),
			entity: document.createElement("a"),
			bio: document.createElement("p"),
			relationships: document.createElement("td"),
			posts: document.createElement("a"),
			following: document.createElement("a"),
			followed: document.createElement("a"),
			birthdate: document.createElement("td"),
			location: document.createElement("td"),
			gender: document.createElement("td"),
			url: document.createElement("a"),
			following_button: document.createElement("button"),
			mention_button: document.createElement("button")
		};

		header.appendChild(this.profile_template.avatar);
		this.profile_template.avatar.src = "img/default-avatar.png";

		var div = document.createElement("div");
		header.appendChild(div);

		this.profile_template.following_button.onclick = function(e) {
			_this.toggleFollow()
		}
		div.appendChild(this.profile_template.following_button);

		this.profile_template.mention_button.onclick = function() {
			HostApp.openNewMessageWidow({entity:_this.entity});
		}
		div.appendChild(this.profile_template.mention_button);
		this.profile_template.mention_button.innerHTML = "Mention";

		div.appendChild(this.profile_template.name);

		var p = document.createElement("p");
		p.appendChild(this.profile_template.entity);
		div.appendChild(p);

		div.appendChild(this.profile_template.bio);

		var table = document.createElement("table");
		div.appendChild(table);

		function mkLi(name, template) {
			var tr = document.createElement("tr");
			var th = document.createElement("th");
			tr.style.display = "none";
			th.innerText = name + ": ";
			tr.appendChild(th);
			tr.appendChild(template);
			table.appendChild(tr);
		}

		mkLi("Birth date", this.profile_template.birthdate);
		mkLi("Location", this.profile_template.location);
		mkLi("Gender", this.profile_template.gender);

		var td = document.createElement("td");
		td.appendChild(this.profile_template.url);
		mkLi("Homepage", td);

		mkLi("Relationships", this.profile_template.relationships);

		td = document.createElement("td");
		td.appendChild(this.profile_template.posts);
		this.profile_template.posts.href = "#";
		this.profile_template.posts.onclick = function() { _this.showPosts(); return false; };
		mkLi("Posts", td);

		td = document.createElement("td");
		td.appendChild(this.profile_template.following);
		this.profile_template.following.href = "#";
		this.profile_template.following.onclick = function() { _this.showFollowings(); return false; };
		mkLi("Following", td);

		td = document.createElement("td");
		td.appendChild(this.profile_template.followed);
		this.profile_template.followed.href = "#";
		this.profile_template.followed.onclick = function() { _this.showFollowers(); return false; };
		mkLi("Followed by", td);


		this.body = document.createElement("ol");
		this.body.className = this.action;
		this.container.appendChild(this.body);

		this.followingsBody = document.createElement("ol");
		this.followingsBody.className = this.action + " followings";
		this.container.appendChild(this.followingsBody);

		this.followersBody = document.createElement("ol");
		this.followersBody.className = this.action + " folloewds";
		this.container.appendChild(this.followersBody);

	}

	Profile.prototype.clear = function() {

		this.server = null;
		this.before = {id: null, entity: null, loading: false};


		this.profile_template.avatar.src = "img/default-avatar.png";

		this.relationships = {
			following_you: false,
			followed_by_you: false,
			it_is_you: false
		}

		this.profile_template.name.innerText = "";
		this.profile_template.entity.innerText = "";
		this.profile_template.bio.innerText = "";
		this.profile_template.relationships.innerText = "";
		this.profile_template.posts.innerText = "";
		this.profile_template.following.innerText = "";
		this.profile_template.followed.innerText = "";
		this.profile_template.birthdate.innerText = "";
		this.profile_template.location.innerText = "";
		this.profile_template.gender.innerText = "";
		this.profile_template.url.innerText = "";
		this.profile_template.url.href = "";

		this.profile_template.posts.parentNode.parentNode.style.display = "none";
		this.profile_template.following.parentNode.parentNode.style.display = "none";
		this.profile_template.followed.parentNode.parentNode.style.display = "none";
		this.profile_template.birthdate.parentNode.style.display = "none";
		this.profile_template.location.parentNode.style.display = "none";
		this.profile_template.gender.parentNode.style.display = "none";
		this.profile_template.url.parentNode.parentNode.style.display = "none";

		this.profile_template.following_button.style.display = "";
		this.setFollowingButton(false);

		this.body.innerHTML = "";
		this.followingsBody.innerHTML = "";
		this.followersBody.innerHTML = "";

		this.showList(this.body);
	};

	Profile.prototype.getProfile = function() {

		var _this = this;

		if (HostApp.stringForKey("entity") == this.entity) {
			this.relationships.it_is_you = true;
			this.profile_template.following_button.style.display = "none";
		}

		var url = HostApp.serverUrl("posts_feed") + "?types=" + encodeURIComponent("https://tent.io/types/meta/v0") + "&entities=" + encodeURIComponent(this.entity);
		APICalls.get(url, {
			callback: function(resp) {
				var profile = JSON.parse(resp.responseText);
				_this.showProfile(profile);
				_this.profile = profile;
		}});
	}

	Profile.prototype.getFollowing = function() {
		if(this.entity != HostApp.stringForKey("entity")) {
			
			var url = HostApp.serverUrl("posts_feed") + "?mentions=" + encodeURIComponent(this.entity) + "&types=" + encodeURIComponent("https://tent.io/types/subscription/v0#https://tent.io/types/status/v0");
			var _this = this;

			APICalls.get(url, {callback: function(resp) {

				var json = JSON.parse(resp.responseText);
				var count = json.posts.length;

				if (count > 0) {
					_this.setFollowingButton(true);
					_this.following_id = json.posts[0].id;
				} else {
					_this.setFollowingButton(false);
					delete _this.following_id;
				}

			}});

		} else {

			this.setFollowingButton(false);
			this.following_id = null;
		}
	}

	Profile.prototype.showProfile = function(profiles) {

		if(profiles.posts.length < 1) return;
		var profile = profiles.posts[0];
		bungloo.cache.profiles[profile.entity] = profile.content.profile;
		
		var basic = profile.content.profile;

		if (profile && basic) {

			// Find and apply avatar
			if(profile.attachments) {

				var digest = null;
				for (var i = 0; i < profile.attachments.length; i++) {
					var attachment = profile.attachments[i];
					if(attachment.category == "avatar") {
						digest = attachment.digest;
						break;
					}
				}

				if(digest) {
					var _this = this;
					this.profile_template.avatar.onerror = function() { _this.profile_template.avatar.src = 'img/default-avatar.png' };
					var avatar_url = profile.content.servers[0].urls.attachment.replace(/\{entity\}/, encodeURIComponent(profile.entity));
					this.profile_template.avatar.src = avatar_url.replace(/\{digest\}/, digest);
				}
			}

			this.populate(this.profile_template.name, basic.name);
			this.populate(this.profile_template.birthdate, basic.birthdate);
			this.populate(this.profile_template.location, basic.location);
			this.populate(this.profile_template.gender, basic.gender);
			this.populate(this.profile_template.bio, basic.bio);

			if(basic.website) {

				var url = basic.website;
				this.profile_template.url.innerText = url;
				this.profile_template.url.parentNode.parentNode.style.display = "";

				if (!url.startsWith("http")) {
					url = "http://" + url;
				}

				this.profile_template.url.href = url;
			}
		}

		if (profile) {
			this.profile = profile;

			// FIXME
			this.getMeta(this.profile);
			this.getStatuses();
		}
	}

	Profile.prototype.populate = function(t, v) {
		if (v) {
			t.innerText = v;
			t.parentNode.style.display = "";
			t.parentNode.parentNode.style.display = "";
		}
	}

	Profile.prototype.getMeta = function(profile) {

		// FIXME!

		var _this = this;
/*
		var url = HostApp.serverUrl("posts_feed") + "?entities=" + encodeURIComponent(this.entity) + "&types=" + encodeURIComponent("https://tent.io/types/subscription/v0#");
		APICalls.head(url, {
			callback: function(resp) {
				_this.populate(_this.profile_template.followed, APICalls.getCount(resp) + " ");
			}
		});      

		var url = HostApp.serverUrl("posts_feed") + "?entities=" + encodeURIComponent(this.entity) + "&types=" + encodeURIComponent("https://tent.io/types/relationship/v0#following");
		APICalls.head(url, {
			callback: function(resp) {
				_this.populate(_this.profile_template.following, APICalls.getCount(resp) + " ");
			}
		});  

		var url = HostApp.serverUrl("posts_feed") + "?entities=" + encodeURIComponent(this.entity) + "&types=" + encodeURIComponent("https://tent.io/types/status/v0#");
		APICalls.head(url, {
			callback: function(resp) {
				_this.populate(_this.profile_template.posts, APICalls.getCount(resp) + " ");
			}
		});  
*/

		// is following you
		// FIXME: should use HEAD
		var url = HostApp.serverUrl("posts_feed") + "?entities=" + encodeURIComponent(this.entity) + "&types=" + encodeURIComponent("https://tent.io/types/subscription/v0#https://tent.io/types/status/v0") + "&mentions=" + encodeURIComponent(HostApp.stringForKey("entity"));
		APICalls.get(url, {
			callback: function(resp) {
				var json = JSON.parse(resp.responseText);
				if (json.posts.length > 0) {
					_this.relationships.following_you = true;
				} else {
					_this.relationships.following_you = false;
				}
				_this.setRelationships();
			}
		}); 

		// is followed by you
		// FIXME: should use HEAD
		var url = HostApp.serverUrl("posts_feed") + "?mentions=" + encodeURIComponent(this.entity) + "&types=" + encodeURIComponent("https://tent.io/types/subscription/v0#https://tent.io/types/status/v0");
		APICalls.get(url, {
			callback: function(resp) {
				var json = JSON.parse(resp.responseText);
				if (json.posts.length > 0) {
					_this.relationships.followed_by_you = true;
				} else {
					_this.relationships.followed_by_you = false;
				}
				_this.setRelationships();
			}
		}); 

		return;
/*


		if (this.entity != HostApp.stringForKey("entity")) {
			APICalls.http_call(URI(root_url + "/followers/" + encodeURIComponent(HostApp.stringForKey("entity"))).toString(), "GET", function(resp) {
				if (resp.status == 200) {
					_this.relationships.following_you = true;
				}
				_this.setRelationships();

			}, null, false);

			APICalls.http_call(URI(APICalls.mkApiRootPath("/followings/" + encodeURIComponent(this.entity))), "GET", function(resp) {
				if (resp.status == 200) {
					_this.relationships.followed_by_you = true;
				}
				_this.setRelationships();
			});

		} else {
			this.setRelationships();
		}


		var url = URI(root_url + "/posts/count");
		var post_types = [
			"https://tent.io/types/post/repost/v0.1.0",
			"https://tent.io/types/post/status/v0.1.0",
			"https://tent.io/types/post/photo/v0.1.0"
		];
		url.addSearch("post_types", post_types.join(","));

		APICalls.http_call(url.toString(), "GET", function(resp) {

			_this.populate(_this.profile_template.posts, resp.responseText);
		}, null, false);*/
	}

	Profile.prototype.setRelationships = function() {
		var relation = "none";
		if (HostApp.stringForKey("entity") == this.entity) {
			relation = "it's you";
		} else {
			if (this.relationships.following_you && !this.relationships.followed_by_you) {
				relation = "is following you";
			} else if (this.relationships.following_you && this.relationships.followed_by_you) {
				relation = "you both follow each other";
			} else if (!this.relationships.following_you && this.relationships.followed_by_you) {
				relation = "being followed by you";
			}
		}
		this.populate(this.profile_template.relationships, relation);
	}


	Profile.prototype.getStatuses = function() {
		this.since_time = null;
		Timeline.prototype.getNewData.call(this, {entities: this.entity});
	}

	Profile.prototype.setFollowingButton = function(following) {

		this.following = following;

		if (following) {
			this.profile_template.following_button.className = "following";
			this.profile_template.following_button.innerText = "Unfollow";
		} else {
			this.profile_template.following_button.className = "";
			this.profile_template.following_button.innerText = "Follow";
		}
	}

	Profile.prototype.toggleFollow = function() {

		var _this = this;

		if (this.following_id) {

			this.setFollowingButton(false);

			var url = HostApp.serverUrl("post").replace(/\{entity\}/, encodeURIComponent(HostApp.stringForKey("entity"))).replace(/\{post\}/, this.following_id);
			APICalls.delete(url, { callback: function(resp) {
				if (resp.status >= 200 && resp.status < 300) {
					_this.setFollowingButton(false);
					delete _this.following_id;
				} else {
					_this.setFollowingButton(true);
				}
				_this.getMeta();
			}});

		} else {

			this.setFollowingButton(true);

			var url = HostApp.serverUrl("new_post");

			var data = {
				content: {
					type: "https://tent.io/types/status/v0"
				},
				mentions: [{
					entity: this.entity
				}],
				type: "https://tent.io/types/subscription/v0#https://tent.io/types/status/v0"
			};

			APICalls.post(url, JSON.stringify(data), {
				content_type: data.type,
				callback: function(resp) {
					if (resp.status >= 200 && resp.status < 300) {
						_this.setFollowingButton(true);
						var json = JSON.parse(resp.responseText);
						_this.following_id = json.post.id;
					} else {
						_this.setFollowingButton(false);
					}
					_this.getMeta();
				}
			});
		}
	}

	Profile.prototype.showPosts = function() {
		this.showList(this.body);
	}

	Profile.prototype.showFollowings = function() {

		this.showList(this.followingsBody);
		this.followingsBody.innerHTML = "";

		var _this = this;
		var callback = function(resp) {
			var followings = JSON.parse(resp.responseText);
			for (var i = 0; i < followings.length; i++) {
				var li = _this.getDOMSmallProfile(followings[i]);
				_this.followingsBody.appendChild(li);
			}
		}

		var url = URI(this.server + "/followings");
		url.addSearch("limit", 200);
		APICalls.http_call(url.toString(), "GET", callback, null, false);
	}

	Profile.prototype.showFollowers = function() {

		this.showList(this.followersBody);
		this.followersBody.innerHTML = "";

		var _this = this;
		var callback = function(resp) {
			var followers = JSON.parse(resp.responseText);
			for (var i = 0; i < followers.length; i++) {
				var li = _this.getDOMSmallProfile(followers[i]);
				_this.followersBody.appendChild(li);
			}
		}

		var url = URI(this.server + "/followers");
		url.addSearch("limit", 200);
		APICalls.http_call(url.toString(), "GET", callback, null, false);
	}

	Profile.prototype.getDOMSmallProfile = function(profile) {

		var li = document.createElement("li");

		var image = document.createElement("img");
		image.title = profile.entity;
		image.className = "image";
		image.src = 'img/default-avatar.png';
		li.appendChild(image);
		image.onclick = function(e) {
			HostApp.showProfileForEntity(e.target.title);
			return false;
		}

		var div = document.createElement("div");
		div.className = "data"

		var h1 = document.createElement("h1");
		var username = document.createElement("a");
		username.title = profile.entity;
		username.className = "name";
		username.href = profile.entity;
		username.onclick = function(e) {
			HostApp.showProfileForEntity(profile.entity);
			return false;
		}

		h1.appendChild(username)
		div.appendChild(h1);
		li.appendChild(div);

		var p = document.createElement("p");
		p.className = "message";

		var entity_tag = document.createElement("a");
		entity_tag.innerText = profile.entity;
		entity_tag.href = profile.entity;
		entity_tag.title = profile.entity;

		var new_line = document.createElement("br");
		var follows_since = document.createTextNode("follows since ");
		var follows_since_time = document.createElement("span");
		follows_since_time.innerText = this.ISODateString(new Date(profile.created_at * 1000));
		follows_since_time.title = follows_since_time.innerText;
		follows_since_time.className = "timeago";
		jQuery(follows_since_time).timeago();

		p.appendChild(entity_tag);
		p.appendChild(new_line);
		p.appendChild(follows_since);
		p.appendChild(follows_since_time);
		div.appendChild(p);

		var profile_callback = function(p) {

			var basic = p["https://tent.io/types/info/basic/v0.1.0"];

			if (p && basic) {
				if(basic.name) {
					username.title = username.innerText;
					username.innerText = basic.name;
				}
				if(basic.avatar_url) {
					image.onerror = function() { image.src = 'img/default-avatar.png'; };
					image.src = basic.avatar_url;
				}
			}

		}

		var p = this.cache.profiles.getItem(profile.entity);

		if (p && p != "null") {

			profile_callback(p);

		} else {

			var _this = this;
			APICalls.findProfileURL(profile.entity, function(profile_url) {

				if (profile_url) {
					APICalls.http_call(profile_url, "GET", function(resp) {
						var p = JSON.parse(resp.responseText);
						if (p && p != "null") {
							_this.cache.profiles.setItem(profile.entity, p);
							profile_callback(p);
						}

					}, null, false); // do not send auth-headers
				}
			});
		}

		return li;
	}




	return Profile;

});
