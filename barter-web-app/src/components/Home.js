import React, { Component } from 'react';
import Contact from './Contact.js';
import '../App.css';
import 'bootstrap/dist/js/bootstrap.bundle.min';
import firebase from 'firebase';
import Rebase from 're-base';
import StyledFirebaseAuth from "react-firebaseui/StyledFirebaseAuth";
import { NavLink } from "react-router-dom";
import PreviewPicture from './PreviewPicture';
import GetProfileImg from './GetProfileImg';
import Card from './Card';
import 'bootstrap/dist/js/bootstrap.bundle.min';
import { library } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCamera } from '@fortawesome/free-solid-svg-icons'
import {faSearch} from '@fortawesome/free-solid-svg-icons'
import {faBars} from '@fortawesome/free-solid-svg-icons'
import {faHome} from '@fortawesome/free-solid-svg-icons'
import {faArchway} from '@fortawesome/free-solid-svg-icons'
import {faStore} from '@fortawesome/free-solid-svg-icons'
import {faHeart as solidHeart} from '@fortawesome/free-solid-svg-icons'
import {faHeart as regularHeart} from '@fortawesome/free-regular-svg-icons'
// import './assets/css/fonts.css';

const uuidv4 = require('uuid/v4');

var heartBool = false;

library.add(faCamera)
library.add(faSearch)
library.add(faBars)
library.add(faHome)
library.add(faArchway)
library.add(faStore)
// library.add(faHeart)

const config = {
    apiKey: process.env.REACT_APP_FIREBASE_KEY,
    authDomain: process.env.REACT_APP_FIREBASE_DOMAIN,
    databaseURL: process.env.REACT_APP_FIREBASE_DATABASE,
    projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
    storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.REACT_APP_FIREBASE_SENDER_ID
};

const app = firebase.initializeApp(config);
const base = Rebase.createClass(app.database());

class Home extends React.Component {
  constructor() {
    super();
    this.ref = firebase.database().ref('barters');
    this.state = {
      isSignedIn: false,
      title: '',
      descr: '',
      photoUrl: null,
      picture: null,
      userID: '',
      userPhoto: '',
      dateTime: '',
      keys: [],
      emails: {},
      category: '',
      toggle: true
    }
    this.onSubmit = this.onSubmit.bind(this);
    this.searchClicked = this.searchClicked.bind(this);
    this.handleChange = this.handleChange.bind(this);
    this.faveHandler = this.faveHandler.bind(this);
    this.setPreferences = this.setPreferences.bind(this);
  }

  uiConfig = {
    signInFlow: "popup",
    signInOptions: [
        firebase.auth.FacebookAuthProvider.PROVIDER_ID,
        firebase.auth.GoogleAuthProvider.PROVIDER_ID,
        firebase.auth.EmailAuthProvider.PROVIDER_ID
    ],
    callbacks: {
      signInSuccess: () => false
    }
  }

  onSubmit(event){
      var newPostKey = firebase.database().ref().child('barters').push().key;
      let {isSignedIn, title, descr, photoUrl, picture, userID, category} = this.state;
      var storageRef = firebase.storage().ref();
      var uniqueID = uuidv4();
      var itemPhotosRef = storageRef.child(`itemPhotos/${uniqueID}`);
      let picUrl = null;
      itemPhotosRef.put(picture).then((snapshot)=> {
        snapshot.ref.getDownloadURL().then((downloadURL) =>{
          photoUrl = downloadURL;
          firebase.database().ref('barters/' + newPostKey).set({
              dateTime: firebase.database.ServerValue.TIMESTAMP,
              descr,
              category,
              photoUrl,
              title,
              userID,
          });
        })
      });

    this.setState({dateTime: ''});
    this.setState({descr: ''});
    this.setState({photoUrl: ''});
    this.setState({title: ''});
  }

  componentDidMount = ()=>{
    firebase.auth().onAuthStateChanged(user =>{
      if(user){
        const userRef = firebase.database().ref('users')
        let curUser = null
        if(user){
          curUser = user.uid;
        }
        userRef.child(curUser).once("value",snapshot => {
          if (!snapshot.val()){
            firebase.database().ref('users/' + curUser).child('email').set(user.email);
            const userNameArr = user.displayName.split(' ');
            firebase.database().ref('users/' + curUser).child('fName').set(userNameArr[0]);
            firebase.database().ref('users/' + curUser).child('lName').set(userNameArr[1]);
            firebase.database().ref('users/' + curUser).child('photoURL').set(user.photoURL);
          }
        });
        firebase.database().ref(`users/${curUser}/faves`).on("value", this.updateFaves.bind(this));
        this.setState({userEmail: user.email});
        this.setState({userName: user.displayName});
        this.setState({userPhoto: user['photoURL']});
      }
      this.setState({isSignedIn:!!user});
      if(user){
        this.setState({userID:user['uid']});
      }

    });
    firebase.database().ref('barters').on('value', (snapshot) => this.gotData(snapshot), this.errData);

    firebase.database().ref('users').on('value', this.makeEmail.bind(this));
  }

  updateFaves(snap){
    const data = snap.val();
    this.setState({faves: data});
    for(let fKey in data){
      const matches = this.state.keys.filter(key => key._id === fKey);
      if(matches.length){
        const index = matches[0].index;
        this.setState(prevState => {
          const nextState = {
            keys: [...prevState.keys]
          };
          nextState.keys[index].fave = data[fKey];
          return nextState;
        });

      }
    }

  }
  makeEmail(data){
    var users = data.val();
    var keys = Object.keys(users);
    const result = {}
    for(var i = 0; i < keys.length;i++){
      var k = keys[i];
      result[k] = users[k].email;
    }
    this.setState({emails: result});
  }
  search(title, search){
    var str = title.toLowerCase();
    var str2 = search.toLowerCase();
    var n1 = str.search(str2);
    var n2 = str2.search(str);
    if(n1 !== -1 || n2 !== -1){
      return true;
    }
    return false;
  }

  gotData(data, oldOrNew, category){
    const search = document.querySelector('#searchText');
    let filter = null;
    if(search){
      filter = search.value;
    }
    var barters = data.val();
    //no matches
    if(!barters){
      this.setState({keys: []});
      return
    }
    var keys = Object.keys(barters);
    const result = []
      for(let i = keys.length-1; i >= 0; i--){
      var k = keys[i];
      if(!filter || this.search(barters[k].title, filter)){
        if(!category || category === 'All' || category === barters[k].category){
          var user = barters[k].userID;
          var dateTime = barters[k].dateTime;
          var title = barters[k].title;
          var photoUrl = barters[k].photoUrl;
          var descr = barters[k].descr;
          var fave = false;
          result.push({user, dateTime, title, photoUrl, descr, _id: k, fave});
        }
      }
    }
    if(oldOrNew === 'Oldest'){
      result.sort(function(a,b){
        // Turn your strings into dates, and then subtract them
        // to get a value that is either negative, positive, or zero.
        return new Date(a.dateTime) - new Date(b.dateTime);
      });
    }

    for(let i=0;i<result.length;i++){
      result[i].index = i;
    }
    this.setState({keys: result}, () => {
      this.updateFaves({val: () => this.state.faves});
    });

  }
  searchClicked(e){
    const oldOrNew = document.querySelector("#exampleFormControlSelect1").value;
    const category = document.querySelector("#exampleFormControlSelect2").value;
    firebase.database().ref('barters').on('value', (snapshot) => this.gotData(snapshot, oldOrNew, category), this.errData);
  }

  errData(err){
    console.log('Error!');
  }
  setPreferences(){
    const oldOrNew = document.querySelector("#exampleFormControlSelect1").value;
    const category = document.querySelector("#exampleFormControlSelect2").value;
    firebase.database().ref('barters').on('value', (snapshot) => this.gotData(snapshot, oldOrNew, category), this.errData);
  }
  handleChange(e) {
    this.setState({
      [e.target.name]: e.target.value
    });
  }

  handleFave = (i) => () => {
    const item = this.state.keys[i];
    const uID = item.userID;
    let itemVal = false ;
    const userRef = firebase.database().ref(`users/${this.state.userID}/faves`);
    userRef.child(item._id).once('value').then(function(snapshot) {
       itemVal = snapshot.val();
    }).then(function(){
      if( itemVal === false ||  itemVal === null){
          userRef.child(item._id).set(true, () => {
          });
      }
      else {
        userRef.child(item._id).set(false, () => {
        });
      }
    });
  }

  faveHandler(event) {
    this.setState((prevState) => ({
        toggle: !prevState.toggle
      })
    );
  }

  addFave = (i) => () => {
    const item = this.state.keys[i];
    const uID = item.userID;
    const userRef = firebase.database().ref(`users/${this.state.userID}/faves`);
    userRef.child(item._id).set(true, () => {
      //console.log('done');
    });



  };


  removeFave = (i) => () => {
    this.setState((prevState) => {
      const nextState = { ...prevState};
      nextState.faves.splice(i,1);
      return nextState;
    });
  };

  renderCards () {
    const keys = this.state.keys;
    var counter = 0;
    var label = '';
    var displayDescr = 'displayDescr';
    const itemList = keys.map((itemId,i) => {
      counter += 1;
      var uniqueID = "h" + uuidv4();
      label = "#" + uniqueID;

      var heartBool = false;
      let email = this.state.emails[itemId.user];

      return(

            <div className = "col-sm-4" key={itemId._id}>
              <div className ="card" styles="width: 30rem;">
                <img class="card-img-top img-fluid" id="itemPhoto" src={itemId.photoUrl} />
                  <div className ="card-body" >
                    <a href="#" class="item-title" data-toggle="modal" data-target={label} ><h5 className ="card-title" styles="padding-top: 30%;">{itemId.title}</h5></a>
                    <button className="heart pull-right" styles="position: relative; display:inline-block;" key={i} onClick={this.handleFave(i)}><FontAwesomeIcon icon={itemId.fave ? solidHeart : regularHeart} /> </button>

                    <div class="modal fade" id={uniqueID} tabindex="-1" role="dialog" aria-labelledby="descrLabel" aria-hidden="true">
                      <div class="modal-dialog" role="document">
                        <div class="modal-content">
                           <div class="modal-body">
                             <div className = "card-img top cardImg" styles="background-size:500px auto;"><PreviewPicture photoUrl={itemId.photoUrl}/></div>
                             <h4> Description </h4>
                             <h6> {itemId.descr}</h6>
                             <Contact email={email}/>
                           </div>
                       </div>
                     </div>
                   </div>

                 </div>
             </div>
           </div>

      )
    });
    return itemList;
  }




  render() {

    return (
      <div className='home'>
      {this.state.isSignedIn ? (
          <span>
          <header>
          <div className='wrapper'>
            <script src="https://www.gstatic.com/firebasejs/5.8.4/firebase.js"></script>
          <div class="barterNav">
            <nav class="navbar navbar-expand-lg navbar-light" >
              <a class="navbar-brand homeLink"><img id="logo" src="/logo.png"/></a>

              <button class="navbar-toggler" type="button" data-toggle="collapse" data-target="#navbarSupportedContent" aria-controls="navbarSupportedContent" aria-expanded="false" aria-label="Toggle navigation">
              <span class="navbar-toggler-icon"></span>
              </button>
              <div class="collapse navbar-collapse" id="navbarSupportedContent">
              <div class="form-inline my-2  my-lg-0">
                <div className="input-group mb-3 search-box">
                    <input id="searchText" class="form-control mr-sm-2" name = "search" type="search" placeholder="Search" aria-label="Search" />
                    <div class="input-group-append">
                    <button className="input-group-text" onClick={this.searchClicked} type="button"><FontAwesomeIcon icon="search" /></button>
                    </div>
                {/* <button class="btn btn-outline-success my-2 my-sm-0" onClick={this.searchClicked} type="button">Search</button> */}
                </div>

              </div>



                  <ul class="navbar-nav ml-auto">
                  <li>
                    <button type="button" class="btn btn-primary m-2" data-toggle="modal" data-target="#addItem">
                      <FontAwesomeIcon icon="camera" /> Add Item
                    </button>
                  </li>
                    <li>
                      <NavLink to="/">  <button className = "btn btn-primary m-2 " type="myItems"> <FontAwesomeIcon icon="home" /> Home</button></NavLink>
                    </li>
                    <li>
                      <NavLink to="/inventory"><button className = "btn btn-primary m-2 " type="myItems"><FontAwesomeIcon icon="archway" /> My Posts</button></NavLink>
                    </li>
                    <li>
                      <NavLink to="/interests"><button className = "btn btn-primary m-2" type="interestedItem"><FontAwesomeIcon icon={solidHeart} /> Favorites</button></NavLink>
                    </li>
                    <li>
                    <GetProfileImg userPhoto={this.state.userPhoto} userEmail={this.state.userEmail} userName = {this.state.userName}/>
                    </li>
                </ul>



              </div>
            </nav>
            <hr/>
          </div>
          </div>
        </header>
      <div className='container'>
      <div className="modal fade" id="addItem" tabindex="-1" role="dialog" aria-labelledby="addItemLabel" aria-hidden="true">
        <div class="modal-dialog" role="document">
          <div class="modal-content">
            <div class="modal-header">
              <p class="heading" id="addItemLabel">
                <strong>Add Item</strong>
              </p>
              <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                <span aria-hidden="true" class="white-text">&times;</span>
              </button>
            </div>
            <div class="modal-body">

              <div class="form-group row">
                <div class="col-sm-10">
                Item
                    <input type="text" class="form-control addItem" name="title" placeholder="What item do you want to trade?" onChange={this.handleChange} value={this.state.item} />
                </div>
              </div>


              <div class="form-group row">
                <div class="col-sm-10">
                 Description
                  <input type="text" class="form-control addItem" name="descr" placeholder="Describe your item" onChange={this.handleChange} value={this.state.descr} />
                </div>
              </div>

              <div class="form-group row">
                <div class="col-sm-10">
                Category
                    <select name="category" class="form-control" onChange={this.handleChange} value={this.state.category}>
                      <option name="Electronics">Electronics</option>
                      <option name="Fashion">Fashion</option>
                      <option name="Home">Home</option>
                      <option name="Sporting">Sporting</option>
                      <option name="School">School</option>
                      <option name="Music">Music</option>
                      <option name="Other">Other</option>
                    </select>
                </div>
              </div>
              <label class="upload-group">
                  Upload Image
                <br/>
                <span class="btn btn-default btn-file">
                  <input type="file" class="upload-group" id="file" onChange={(event) => {
                    this.displayPicture(event);
                  }}/>
                </span>
              </label>
              <PreviewPicture photoUrl={this.state.photoUrl}/>
            </div>
            <div class="modal-footer">
              {/* <button type="button" class="btn btn-secondary" data-dismiss="modal">Close</button> */}
              <button type="btn btn-info" onClick={this.onSubmit} type="reset" data-dismiss="modal" id="addItemBtn">Add Item to Barter</button>
            </div>
          </div>
        </div>
      </div>
      <br></br>
      <form>
        <div class="form-row">
        <div class="form-group">
          <select class="form-control" id="exampleFormControlSelect1">
          <option>Latest</option>
          <option>Oldest</option>
          </select>
        </div>
          <div class="form-group">
            <select class="form-control" id="exampleFormControlSelect2">
            <option>All</option>
            <option>Electronics</option>
            <option>Fashion</option>
            <option>Home</option>
            <option>Sporting</option>
            <option>School</option>
            <option>Music</option>
            <option>Other</option>
            </select>
          </div>
          <div class="form-group">
            <button type="button" class="btn btn-primary sort" onClick={this.setPreferences}>Sort</button>
          </div>
        </div>
      </form>
        <section className='display-item'>
          <div className='container-fluid'>
            <div className="row">
              {this.renderCards()}
              {/* {
                 this.state.keys.map(key => <HomeCard data={key} />)
              } */}
            </div>
          </div>
        </section>
      </div>
          </span>

        ) : (
          <div>
            <header>
            <img id="logoLogin" src="/logo.png"/>
            {/* <h3 styles="position:'relative';left:10%; top:5%;">Exchange goods & services </h3>  */}
            </header>


          <StyledFirebaseAuth class="LoginButtons"
            uiConfig={this.uiConfig}
            firebaseAuth={firebase.auth()
            }
          />
          <img id="appstoreLogo" src="/appstoreLogo.png"/>
          </div>


        )}
      </div>
    );
  }

  displayPicture(event){
    //new
    let reader = new FileReader();
    let file = event.target.files[0];

    reader.onloadend = ()=>{
      this.setState({
        picture: file,
        photoUrl: reader.result
      });
    };
    reader.readAsDataURL(file);
  }
}

export default Home;
