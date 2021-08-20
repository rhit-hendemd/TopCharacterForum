var rhit = rhit || {};

rhit.FB_COLLECTION_TIERLIST = "AllTierlists";
rhit.FB_COLLECTION_USERS = "Users";
rhit.FB_COLLECTION_PHOTOS = "Photos"
rhit.FB_COLLECTION_RANKS = "Ranks";

rhit.FB_KEY_NAME = "name";
rhit.FB_KEY_CREATOR_NAME = "CreatorName";
rhit.FB_KEY_PHOTO_URL = "PhotoURL";


rhit.FB_KEY_AUTHOR = "CreatorID";
rhit.FB_KEY_TIER_PHOTO = "photoURL";
rhit.FB_KEY_TITLE = "Title";

rhit.FB_KEY_LIKES = "Likes";
rhit.FB_KEY_DISLIKES = "Dislikes"

rhit.FB_KEY_RANK = "hierarchy";
rhit.FB_KEY_CHARS = "Characters";
rhit.FB_KEY_LABEL = "Label";
rhit.FB_KEY_COLOR = "Color";
rhit.FB_KEY_WHY = "why";

rhit.fbTierListsManager = null;
rhit.fbSingleTierManager = null;
rhit.fbAuthManager = null;
rhit.fbUserManager = null;


//From: https://stackoverflow.com/questions/494143/creating-a-new-dom-element-from-an-html-string-using-built-in-dom-methods-or-pro/35385518#35385518
function htmlToElement(html) {
	var template = document.createElement('template');
	html = html.trim();
	template.innerHTML = html;
	return template.content.firstChild;
}

rhit.SideNavController = class {
	constructor() {
		const menuShowAllQuotesItem = document.querySelector("#menuAll")
		if (menuShowAllQuotesItem) {
			menuShowAllQuotesItem.addEventListener("click", (event) => {
				console.log("show all tier lists");
				window.location.href = "/tierlist.html";
			});
		}

		const menuShowMyQuotesItem = document.querySelector("#menuMine")
		if (menuShowAllQuotesItem) {
			menuShowMyQuotesItem.addEventListener("click", (event) => {
				console.log("showmyquotes");
				window.location.href = `/tierlist.html?uid=${rhit.fbAuthManager.uid}`;
			});
		}

		const submitTierPhoto = document.querySelector("#submitTierPhoto");
		submitTierPhoto.addEventListener("click", (event) => {
			document.querySelector("#inputFile").click();
		});
		
		const startBuild = document.querySelector("#initiateBuildTier")
		if (startBuild) {
			startBuild.addEventListener("click", (event) => {
				const title = document.querySelector("#titleInput").value;
				const category = document.querySelector("#categoryInput").value;
				const publicOn = document.querySelector("#publicInput").value;
				const description = document.querySelector("#descriptionInput").value;
				const fileProps = document.querySelector("#inputFile").files;
				const file = fileProps[0];
				console.log(`${title}, ${category}, ${publicOn}, ${description}, ${file}`);
				rhit.fbTierListsManager.uploadPhotoToStorage(file, rhit.fbAuthManager.name, title, category, publicOn, description);
			});
		}

		const menuBuild = document.querySelector("#menuMake");
		if(menuBuild) {
			menuBuild.addEventListener("click", (event) => {
				console.log(`${rhit.fbAuthManager.userID} is making a new tier list.`);
				document.querySelector("#tierPromptButton").click();
			})
		}

		const menuSignOutItem = document.querySelector("#menuSignOut")
		if (menuSignOutItem) {
			menuSignOutItem.addEventListener("click", (event) => {
				rhit.fbAuthManager.signOut();
			});
		}

		if(rhit.fbAuthManager) {
			if(rhit.fbAuthManager.isAnonymous) {
				document.querySelector("#menuMake").hidden = true;
			}
		}
	}
}

rhit.ListPageController = class {
	constructor() {
		console.log("List controller made");
		//Start listening
		rhit.fbTierListsManager.beginListening(this.updateList.bind(this));
	}



	updateList() {
		if(rhit.fbTierListsManager.uid) {
			if(!rhit.fbUserManager.isListening) {
				rhit.fbUserManager.beginListening(rhit.fbTierListsManager.uid, () => {
					console.log(`Listening for: ${rhit.fbUserManager.name}`);
				});
			}
		}


		//Make a new quoteListContainer
		const newList = htmlToElement('<div id="previewContainer"></div>');
		//Fill the quoteListContainer with quote cards usin a loop
		for (let i = 0; i < rhit.fbTierListsManager.length; i++) {
			const tierList = rhit.fbTierListsManager.getTierByIndex(i);
			console.log(tierList.photoURL);
			const newCard = this._createTierCard(tierList);
			newCard.onclick = () => {
				console.log(`You clicked on ${tierList.id}`);
				// rhit.storage.setMovieQuoteId(mq.id);
				window.location.href = `/viewTier.html?id=${tierList.id}`;
			};
			newList.appendChild(newCard);
		}

		//Remove the old quoteListContainer
		const oldList = document.querySelector("#previewContainer");
		oldList.removeAttribute("id");
		oldList.hidden = true;
		//Put in the new quoteListContainer
		oldList.parentElement.appendChild(newList);

	}

	_createTierCard(tierList) {
		return htmlToElement(`<div class="card">
		<div class="bg-image hover-overlay ripple" data-mdb-ripple-color="light">
		  <img
			src="${tierList.photoURL}"
			class="img-fluid"
		  />
		  <a href="#!">
			<div class="mask" style="background-color: rgba(251, 251, 251, 0.15);"></div>
		  </a>
		</div>
		<div class="card-body">
		  <h5 class="card-title">${tierList.title}</h5>
		  <p class="card-text">
			By: ${tierList.author}
		  </p>
		</div>
	  </div>`);
	}
}

rhit.TierList = class {
	constructor(docID, photoURL, title, author) {
		this.id = docID;
		this.photoURL = photoURL;
		this.title = title;
		this.author = author
	}
}

rhit.FBTierListsManager = class {
	constructor(uid) {
		this.uid = uid;
		this._docSnaps = [];
		this._ref = firebase.firestore().collection(rhit.FB_COLLECTION_TIERLIST);
		this._unsubscribe = null;
	}

	beginListening(changeListener) {
		let query = this._ref.limit(10);
		//check if a user is logged in
		if(this.uid) {
			query = query.where(rhit.FB_KEY_AUTHOR, "==", this.uid);
		}

		this._unsubscribe = query.onSnapshot(querySnap => {
			console.log("List Page updated!");
			this._docSnaps = querySnap.docs;
			querySnap.forEach((doc) => {
				console.log(doc.data());
			});
			changeListener();
		});


	}

	stopListening() {
		this._unsubscribe();
	}

	//Add new tier list to the firestore
	makeNewTier(title, category, publicOn, description, photoURL) {
		firebase.firestore().collection(rhit.FB_COLLECTION_TIERLIST).add({
			Category: `${category}`,
			CreatorID: `${rhit.fbAuthManager.uid}`,
			CreatorName: `${rhit.fbAuthManager.name}`,
			Dislikes: 0,
			Likes: 0,
			Title: `${title}`,
			isPublic: `${publicOn}`,
			Description: `${description}`,
			photoURL: `${photoURL}`
		}).then((docRef) => {
			firebase.firestore().collection(`${rhit.FB_COLLECTION_TIERLIST}/${docRef.id}/${rhit.FB_COLLECTION_RANKS}`).add({
				[rhit.FB_KEY_CHARS]: {},
				[rhit.FB_KEY_RANK]: 0,
				Label: "A"
			}).then((rankRef) => {
				console.log(`${rankRef.id} has been added to this tier`);
			});
		});
	}

	getTierByIndex(i) {
		if(this.length == 0) {
			console.log("No tierlists available");
			return null;
		} else {
			const tierDoc = this._docSnaps[i];
			const tierList = new rhit.TierList(tierDoc.id, tierDoc.get(rhit.FB_KEY_TIER_PHOTO),
				tierDoc.get(rhit.FB_KEY_TITLE), tierDoc.get(rhit.FB_KEY_CREATOR_NAME)
			 );
			 return tierList;
		}
	}

	//Upload photo for tierlist preview to the storage
	uploadPhotoToStorage(file, tierCreator, title, category, publicOn, description) {
		const metadata = {
			"content-type": file.type
		};
		const storageRef = firebase.storage().ref().child(rhit.FB_COLLECTION_USERS).child(rhit.fbAuthManager.uid);
		firebase.firestore().collection(rhit.FB_COLLECTION_PHOTOS).add({})
		.then((docRef) => {
			console.log("Blank document written with ID: ", docRef.id);
			const nextAvailableKey = docRef.id;
			const storageRef = firebase.storage().ref().child(rhit.FB_COLLECTION_PHOTOS).child(nextAvailableKey);
			storageRef.put(file, metadata)
			.then((uploadSnap) => {
				console.log("Upload done", uploadSnap);
				storageRef.getDownloadURL()
				.then((downloadURL) => {
					console.log("File available at", downloadURL);
					// TODO: Update a Firestore object with this download URL.
					docRef.set({
						url: downloadURL,
						photoFor: `${tierCreator}`
					}).then(()=>{
						this.makeNewTier(title, category, publicOn, description, downloadURL);
					});
				});
			});
			
		});

	};

	get length() {
		return this._docSnaps.length;
	}
}

rhit.SingleTierController = class {
	constructor() {
		console.log("Single Tier Page Created");
		//for deletion
		this.selectedPhotoRank = null;

		if(document.querySelector("#editTier")) {
			document.querySelector("#editTier").onclick = (event) => {
				if(rhit.fbSingleTierManager.isEditing) {
					rhit.fbSingleTierManager.isEditing = false;
					this.updateScreen();
				} else {
					console.log("Edit mode!");
					rhit.fbSingleTierManager.isEditing = true;
					this.updateScreen();
				}
			}
		}

		if(document.querySelector("#stopEdit")) {
			document.querySelector("#stopEdit").onclick = (event) => {
				rhit.fbSingleTierManager.isEditing = false;
				this.updateScreen();
			}
		}

		document.querySelector("#submitPhoto").onclick = (event) => {
			document.querySelector("#inputFile").click();
		};

		document.querySelector("#submitAddCharacter").onclick = (event) => {
			const fileProps = document.querySelector("#inputFile").files;
			const file = fileProps[0];
			console.log(`Received file${file.name}`);
			const characterName = document.querySelector("#inputName").value;
			const characterWhy = document.querySelector("#inputWhy").value;
			console.log("Character's name", characterName);
			console.log("Character's why", characterWhy);
			this.uploadPhotoToStorage(file, characterName, characterWhy);
		};

		document.querySelector("#deleteCharacter").onclick = (event) => {
			let nameToDelete = document.querySelector("#characterWhyModal").dataset.name;
			let rankNumber = parseInt(document.querySelector("#characterWhyModal").dataset.rank);
			console.log("Name from controller", nameToDelete);
			console.log("Character rank from controller", rankNumber);
			rhit.fbSingleTierManager.removeCharacter(nameToDelete, rankNumber);
		};

		document.querySelector("#confirmDeleteTier").onclick = (event) => {
			rhit.fbSingleTierManager.delete(0);
		}


		rhit.fbSingleTierManager.beginListening(this.updateScreen.bind(this));
	}

	uploadPhotoToStorage(file, characterName, characterWhy) {
		const metadata = {
			"content-type": file.type
		};
		const storageRef = firebase.storage().ref().child(rhit.FB_COLLECTION_USERS).child(rhit.fbAuthManager.uid);
		firebase.firestore().collection(rhit.FB_COLLECTION_PHOTOS).add({})
			.then((docRef) => {
				console.log("Blank document written with ID: ", docRef.id);
				const nextAvailableKey = docRef.id;
				const storageRef = firebase.storage().ref().child(rhit.FB_COLLECTION_PHOTOS).child(nextAvailableKey);
				console.log("Ready to upload the file to: ", storageRef);
				storageRef.put(file, metadata).then((uploadSnapshot) => {
					console.log("Upload is complete!", uploadSnapshot);
					storageRef.getDownloadURL().then((downloadURL) => {
						console.log("File available at", downloadURL);
						// TODO: Update a Firestore object with this download URL.
						docRef.set({
							url: downloadURL,
							photoOf: `${characterName}`
						}).then(() => {
							console.log(`${docRef.id} url changed.`);
							rhit.fbSingleTierManager.addCharacter(characterName, characterWhy, this.selectedPhotoRank, downloadURL);

						});
					});
				});
				console.log("Uploading", file.name);
			});
	};

	updateScreen() {
		const newList = htmlToElement('<div id="viewTierContainer"></div>');
		// const title = htmlToElement();
		console.log("Number of rank snapshots:", rhit.fbSingleTierManager.length);
		document.querySelector("#tierTitle").textContent = rhit.fbSingleTierManager.title;
		for (let i = 0; i < rhit.fbSingleTierManager.length; i++) {
			const rank = rhit.fbSingleTierManager.getRankByHierarchy(i);
			const newRank = this._createRank(rank, i);
			console.log(newRank);
			newList.appendChild(newRank);
		}

		const oldList = document.querySelector("#viewTierContainer");
		oldList.removeAttribute("id");
		oldList.hidden = true;

		oldList.parentElement.appendChild(newList);

		if (rhit.fbSingleTierManager.description) {
			$("#descriptionMessage").text(`${rhit.fbSingleTierManager.description}`);
		}

		if (rhit.fbSingleTierManager.author != rhit.fbAuthManager.uid) {
			document.querySelector("#editTier").hidden = true;
			document.querySelector("#deleteCharacter").hidden = true;
			document.querySelector("#deleteTier").hidden = true;

		} else if (rhit.fbSingleTierManager.isEditing) {
			// console.log("Need to make editing icons appear");
			let ranks = document.querySelectorAll("#characters");
			let newRankButton = htmlToElement(
				`<div id="rank">
					<div id="rankLabel"><img class="addRank" src="/images/plus.png"></div>
				</div>`
			)

			newRankButton.onclick = (params) => {
				rhit.fbSingleTierManager.newRank();
			};

			$("#viewTierContainer").append(newRankButton);
			let editButton = $("#editTier");
			editButton.html('<i class="material-icons">done</i>&nbsp;&nbsp;Stop Edit');
		} else {
			let editButton = $("#editTier");
			editButton.html('<i class="material-icons">edit</i>&nbsp;&nbsp;&nbsp;Edit');
		}

	}

	_createRank(rank, number) {
		const rankHolder = htmlToElement(
			`<div id="rank"></div>`
		);
		const label = htmlToElement(
			`<div id="rankLabel"><span>${rank.label}</span></div>`
		);
		rankHolder.appendChild(label);
		const characters = htmlToElement(
			`<div id="characters"></div>`
		);
		const keys = Object.keys(rank.characters);
		const vals = Object.values(rank.characters);
		console.log("Total characters in this rank:", keys.length);
		console.log(vals);
		console.log(keys);
		for (let i = 0; i < keys.length; i++) {
			const valueName = keys[i];
			const valuePhoto = vals[i]["photoURL"];
			const valueWhy = vals[i]["why"];
			console.log(`${valueName} added to ${rank.label} rank.`);
			let characterChild = htmlToElement(
				`<img class="rankChar" src="${valuePhoto}" data-rank="${rank.level}" alt="${valueName}">`
			);
			characterChild.onclick = (event) => {
				$("#characterWhyModal").text(`Why I Put ${valueName} Here.`)
				$("#whyMessage").text(`${valueWhy}`);
				$("#characterInfoButton").trigger("click");
				document.querySelector("#characterWhyModal").dataset.name = valueName;
				document.querySelector("#characterWhyModal").dataset.rank = number;	
			};
			characters.appendChild(characterChild);
		};

		if (rhit.fbSingleTierManager.isEditing) {
			const plus = htmlToElement(`
			<img class="rankChar" src="/images/plus.png" data-rank="${number}" alt="Add Character">
		`);
			plus.onclick = (event) => {
				console.log("clicked add");
				this.selectedPhotoRank = parseInt(plus.dataset.rank);
				$("#fab").trigger("click");
			};
			characters.appendChild(plus);
		}
		rankHolder.appendChild(characters);
		//Easier to set the click functions here rather than outside the function simply because we have already declared the variables

		return rankHolder;
	}

}

rhit.FBSingleTierManager = class {
	constructor(id) {
		this.tierID = id;
		this.tierDescription = null;
		this.documentSnapshot;
		this._unsubscribe = null;
		this._ref = firebase.firestore().collection(rhit.FB_COLLECTION_TIERLIST).doc(this.tierID);
		this._ranksRef = firebase.firestore().collection(`${rhit.FB_COLLECTION_TIERLIST}/${this.tierID}/${rhit.FB_COLLECTION_RANKS}`).orderBy("hierarchy", "asc");
		this._rankSnapshots = [];
		this.editMode = false;
	}

	beginListening(changeListener) {
		this._unsubscribe = this._ref.onSnapshot((docSnap) => {
			this.documentSnapshot = docSnap;
			this.tierDescription = docSnap.get("Description");
			this._ranksRef.onSnapshot((querySnapshot) => {
				console.log("Tier List Update");
				console.log(querySnapshot);
				this._rankSnapshots = querySnapshot.docs;
				querySnapshot.forEach((doc) => {
					console.log(doc.data());
				});

				changeListener();
			});
		});
	}

	stopListening() {
		this._unsubscribe();
	}

	newRank() {
		let lastRank = this.getRankByHierarchy(this.length - 1);
		let nextLabel = String.fromCharCode(lastRank.label.charCodeAt(lastRank.label) + 1);
		let addedRank = this.length;
		firebase.firestore().collection(`${rhit.FB_COLLECTION_TIERLIST}/${this.tierID}/${rhit.FB_COLLECTION_RANKS}`).add({
			[rhit.FB_KEY_CHARS]: {},
			[rhit.FB_KEY_RANK]: addedRank,
			[rhit.FB_KEY_LABEL]: `${nextLabel}`
		}).then(() => {
			console.log(`New Rank Adde with label ${nextLabel}.`);
		});
	}

	addCharacter(name, why, hierarchy, photoURL) {
		const rankID = this._rankSnapshots[hierarchy].id;
		const rankRef = firebase.firestore().collection(`${rhit.FB_COLLECTION_TIERLIST}/${this.tierID}/${rhit.FB_COLLECTION_RANKS}`).doc(rankID);
		const fieldName = "Characters." + name;
		rankRef.update({
			[fieldName]: {
				[rhit.FB_KEY_WHY]: `${why}`,
				[rhit.FB_KEY_TIER_PHOTO]: `${photoURL}`
			}
		}).then(() => {
			console.log(`${rankID} updated with characters`);
			return;
		});
	}

	removeCharacter(charName, charRank) {
		console.log(`Called remove on ${charName} ${charRank}`);
		const rankID = this._rankSnapshots[charRank].id;
		const rankRef = firebase.firestore().collection(`${rhit.FB_COLLECTION_TIERLIST}/${this.tierID}/${rhit.FB_COLLECTION_RANKS}`).doc(rankID);
		const fieldName = "Characters." + charName;
		var removeChar = rankRef.update({
			[fieldName]: firebase.firestore.FieldValue.delete()
		}).then((params) => {
			console.log(`${charName} deleted successfully`);
		});
	}

	getRankByHierarchy(hierarchy) {
		if (this._rankSnapshots.length == 0) {
			console.log("No Snapshots");
			return null;
		}
		const rankSnapshot = this._rankSnapshots[hierarchy];
		const rank = new rhit.Rank(
			rankSnapshot.get(rhit.FB_KEY_CHARS),
			rankSnapshot.get(rhit.FB_KEY_LABEL),
			rankSnapshot.get(rhit.FB_KEY_COLOR),
			rankSnapshot.get(rhit.FB_KEY_RANK),
		);
		return rank;
	}

	delete(i) {
		if(i == this._rankSnapshots.length) {
			rhit.fbSingleTierManager.deleteTier().then((params) => {
				window.location.href = "/tierlist.html";
			});
		} else {
			firebase.firestore().collection(`${rhit.FB_COLLECTION_TIERLIST}/${this.tierID}/${rhit.FB_COLLECTION_RANKS}`).doc(this._rankSnapshots[i].id).delete().then(() => {
				this.delete(i);
			})
		}
	}

	deleteTier() {
		return this._ref.delete();
	}

	get length() {
		return this._rankSnapshots.length;
	}

	get title() {
		return this.documentSnapshot.get(rhit.FB_KEY_TITLE);
	}

	get dislikes() {
		return this.documentSnapshot.get(rhit.FB_KEY_DISLIKES);
	}

	get likes() {
		return this.documentSnapshot.get(rhit.FB_KEY_LIKES);
	}

	get author() {
		return this.documentSnapshot.get(rhit.FB_KEY_AUTHOR);
	}

	get isEditing() {
		return this.editMode;
	}

	get description() {
		return this.tierDescription;
	}

	set isEditing(mode) {
		this.editMode = mode;
	}

}

rhit.Rank = class {
	constructor(characters, label, color, rank, description) {
		this.characters = characters;
		this.label = label;
		this.color = color;
		this.level = rank;
		this.description = description;
	}
}

rhit.LoginPageController = class {
	constructor() {
		document.querySelector("#roseFireButton").onclick = (event) => {
			rhit.fbAuthManager.signIn();
		};
		rhit.fbAuthManager.startFirebaseUI();
	}
}

rhit.FbAuthManager = class {
	constructor() {
		this._user = null;
		this._name = "";
		this._photoUrl = "";
	}

	beginListening(changeListener) {
		firebase.auth().onAuthStateChanged((user) => {
			this._user = user;
			console.log("User", this._user);
			changeListener();
		});
	}

	signIn() {
		console.log("Need to Sign In using Rosefire");

		Rosefire.signIn("51211181-20c5-4a09-8c5c-eff9dde2a25a", (err, rfUser) => {
			if (err) {
				console.log("Rosefire error!", err);
				return;
			}
			console.log("Rosefire success!", rfUser);
			this._name = rfUser.name;
			console.log("Name", this._name);
			firebase.auth().signInWithCustomToken(rfUser.token).catch((error) => {
				const errorCode = error.code;
				const errorMessage = error.message;
				if (errorCode === 'auth/invalid-custom-token') {
					alert('The token you provided is not valid.');
				} else {
					console.error("Custom token error", errorCode, errorMessage);
				}
			});
		});

	}

	signOut() {
		firebase.auth().signOut().catch((error) => {
			// An error happened.
			console.log("Sign out error");
		});
	}

	startFirebaseUI() {
		// FirebaseUI config.
		const uiConfig = {
			signInSuccessUrl: '/',
			signInOptions: [
			  // Leave the lines as is for the providers you want to offer your users.
			  firebase.auth.GoogleAuthProvider.PROVIDER_ID,
			  firebase.auth.EmailAuthProvider.PROVIDER_ID,
			  firebaseui.auth.AnonymousAuthProvider.PROVIDER_ID
			],
			// tosUrl and privacyPolicyUrl accept either url string or a callback
			// function.
			// Terms of service url/callback.
			tosUrl: '<your-tos-url>',
			// Privacy policy url/callback.
			privacyPolicyUrl: function() {
			  window.location.assign('<your-privacy-policy-url>');
			}
		  };
	
		  // Initialize the FirebaseUI Widget using Firebase.
		  const ui = firebaseui.auth.AuthUI.getInstance() || new firebaseui.auth.AuthUI(firebase.auth());
		  // The start method will wait until the DOM is loaded.
		  ui.start('#firebaseui-auth-container', uiConfig);
	} 

	get isSignedIn() {
		return !!this._user;
	}

	get isAnonymous() {
		if(this._user) {
			return this._user.isAnonymous;
		} else {
			return false;
		}
	}

	get uid() {
		if(this._user == null) {
			return null;
		} else {
			return this._user.uid;
		}
	}

	get name() {
		return this._name || this._user.displayName || this._user.uid; //get from current user's name or firebase user displayName
	}

	get photoUrl() {
		return this._photoUrl || this._user.photoURL;
	}
}

rhit.FbUserManager = class {
	constructor() {
		console.log("User manager made.");
		this._collectionRef = firebase.firestore().collection(rhit.FB_COLLECTION_USERS);
		this._document = null;
		this._unsubscribe = null;
	}
	
	addNewUserMaybe(uid, name, photoURL) {
		//check if user is already in firebase
		const userRef = this._collectionRef.doc(uid);

			console.log("Add user received name", name);
			console.log("Add user received uid", uid);
			console.log("Add user received photoURL", photoURL);

		return userRef.get().then((doc) => {
			if (doc.exists) {
				console.log("Document data:", doc.data());
				//do nothing
				return false;
			} else {
				// doc.data() will be undefined in this case
				console.log("Creating this user!");

				// Make sure this returns a promise so the chain stays alive
				return userRef.set({
					[rhit.FB_KEY_NAME]: name,
					[rhit.FB_KEY_TIER_PHOTO]: photoURL,
				})
				.then(() => {
					console.log("Document successfully written!");
					return true;
				})
				.catch((error) => {
					console.error("Error writing document: ", error);
				});
			}
		}).catch((error) => {
			console.log("Error getting document:", error);
		});

	}

	beginListening(uid, changeListener) {
		const userRef = this._collectionRef.doc(uid);
		//if unsubscribe exists we know we are already lsitening
		this._unsubscribe = userRef.onSnapshot((doc) => {
			if (doc.exists) {
				console.log("Document data:", doc.data());
				this._document = doc;
				changeListener();
			} else {
				// doc.data() will be undefined in this case
				console.log("No user... THAT'S BAD!!");
			}
		});
	}

	stopListening() {
		this._unsubscribe();
	}

	updatePhotoUrl(photoUrl) {
		console.log("To Do");
		const userRef = this._collectionRef.doc(rhit.fbAuthManager.uid);
		userRef.update({
				[rhit.FB_KEY_TIER_PHOTO]: photoUrl,
			})
			.then(() => {
				console.log("Document photo successfully updated!");
			})
			.catch((error) => {
				console.error("Error adding document: ", error);
			});
	}

	updateName(name) {
		console.log("To Do");
		const userRef = this._collectionRef.doc(rhit.fbAuthManager.uid);
		//need it here becase the window changes before name is changed without promise
		return userRef.update({
				[rhit.FB_KEY_NAME]: name,
			})
			.then(() => {
				console.log("Document name successfully updated!");
			})
			.catch((error) => {
				console.error("Error adding document: ", error);
			});
	}

	get name() {
		return this._document.get(rhit.FB_KEY_NAME);
	}
	get photoUrl() {
		return this._document.get(rhit.FB_KEY_TIER_PHOTO);
	}
	get isListening() {
		return !!this._unsubscribe; //BANGBANG
	}
}

rhit.checkForRedirects = function () {
	if (document.querySelector("#loginPage") && rhit.fbAuthManager.isSignedIn) {
		window.location.href = "/tierlist.html";
		console.log("GOING TO PREVIEW PAGE");
	}

	if (!document.querySelector("#loginPage") && !rhit.fbAuthManager.isSignedIn) {
		window.location.href = "/index.html";
	}
}

rhit.initializePage = function () {
	const urlParams = new URLSearchParams(window.location.search);
	if(!document.querySelector("#loginPage")) {
		new rhit.SideNavController();
	}

	if (document.querySelector("#tierPreviews")) {
		console.log("You are on the list page.");

		//get user id from url
		const uid = urlParams.get("uid");
		console.log(`uid: ${uid}`);

		rhit.fbTierListsManager = new rhit.FBTierListsManager(uid);
		new rhit.ListPageController();
	}

	if (document.querySelector("#viewTierPage")) {
		console.log("You are on the individual tier page.");
		const tierID = urlParams.get("id")
		console.log(`tierID: ${tierID}`);
		if (!tierID) {
			console.log("No Tier ID!");
			window.location.href = "/";
		}

		rhit.fbSingleTierManager = new rhit.FBSingleTierManager(tierID);
		new rhit.SingleTierController();
	}

	// if (document.querySelector("#detailPage")) {
	// 	console.log("You are on the detail page.");

	// 	//get quote id from url
	// 	const movieQuoteId = urlParams.get("id");
	// 	console.log(`Detail page for ${movieQuoteId}`);

	// 	if (!movieQuoteId) {
	// 		console.log("Error! Missing movie id!");
	// 		window.location.href = "/";
	// 	}
	// 	rhit.fbTierManager = new rhit.fbTierManager(movieQuoteId);
	// 	new rhit.DetailPageController();

	// }

	if (document.querySelector("#loginPage")) {
		console.log("You are on the login page.");
		new rhit.LoginPageController();
	}
}

rhit.createUserObjectIfNeeded = function () {
	return new Promise((resolve, reject) => {
		//resolve();

		//check if a user migth be new
		if (!rhit.fbAuthManager.isSignedIn) {
			console.log("no user so no check");
			resolve(false);
			return;
		}
		if (!document.querySelector("#loginPage")) {
			console.log("not on login page");
			resolve(false);
			return;
		}

		//call adnewusermaybe
		console.log("checking user");	
		rhit.fbUserManager.addNewUserMaybe(
			rhit.fbAuthManager.uid,
			rhit.fbAuthManager.name,
			rhit.fbAuthManager.photoUrl
		).then((isUserNew) => {
			resolve(isUserNew);
		});
	});
}

/* Main */
/** function and class syntax examples */
rhit.main = function () {
	console.log("Ready");
	rhit.fbAuthManager = new rhit.FbAuthManager();
	rhit.fbUserManager = new rhit.FbUserManager();
	rhit.fbAuthManager.beginListening(() => {
		console.log("auth change callback fired. check for redirect and init the page");
		console.log("isSignedIn:", rhit.fbAuthManager.isSignedIn);
		//check if a new user is needed
		rhit.createUserObjectIfNeeded().then((isUserNew) => {
			rhit.checkForRedirects();
			rhit.initializePage();
		});
	});



};

rhit.main();