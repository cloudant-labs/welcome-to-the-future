var couchapp = require('couchapp');

ddoc = {
    // name of the design doc
    _id: '_design/queries',
    views: {
      // view code goes here
      votes: {
        map: function (doc) {
          if (doc.type === 'vote') {
            emit(doc.post, username);
          }
        },
        reduce: '_count'
      },
      posts_by_user: {
        map: function (doc) {
          if (doc.type === 'post') {
            emit(doc.user, doc._id);
          }
        },
        reduce: '_count'
      },
      recent: {
        map: function (doc) {
          if (doc.type === 'post') {
            emit(doc.created_at, null);
          }
        }
      },
      hot: {
        map: function (doc) {
          if (doc.type === 'post') {
            emit([doc._id, doc.created_at, doc], null);
          } else if (doc.type === 'vote') {
            emit([doc.post, 0], null);
          }
        },
        reduce: '_count'
      }
    },
    lists: {
      // list code goes here
    },
    shows: {
      // show code goes here
    },
    validate_doc_update: function (newDoc, oldDoc, userCtx) {
      switch (newDoc.type) {
        case 'vote':
          // validate vote
          if (userCtx.name !== newDoc.user) {
            throw({ 
              forbidden: 'User can only vote as self: ' + [userCtx.name, newDoc.user].join(', ')
            });
          } else {
            var reversed = newDoc._id.reverse(),
                split = reversed.indexOf('-'),
                username = reversed.substring(split).reverse(),
                post_id = reversed.substring(0, split).reverse();
            if (username !== newDoc.user) {
              throw({
                forbidden: 'User can only vote as self: ' + [username, newDoc.user].join(', ')
              });
            } else if (post_id !== newDoc.post) {
              throw ({ 
                forbidden: 'Post _id mismatch: ' + [post_id, newDoc.post].join(', ')
              });
            }
          }
          break;
        case 'post':
          // validate post
          if (userCtx.name !== newDoc.user) {
            throw({ 
              forbidden: 'User can only post as self: ' + [userCtx.name, newDoc.user].join(', ')
            });
          } else if (new Date(newDoc.created_at).getTime().isNaN()) {
            throw({ 
              forbidden: 'Invalid date: ' + newDoc.created_at
            });
          } else if (newDoc.text.length === 0) {
            throw({ 
              forbidden: 'Post cannot be empty: ' + newDoc.text
            });
          }
          break;
        default:
          throw({
            forbidden: 'Unrecognized type'
          });
      }
    },
    filters: {
      // only replicate votes and posts
      content: function (doc, req) {
        if (['vote', 'post'].indexOf(doc.type) === -1) {
          return false;
        } else {
          return true;
        }
      }
    }
};

// uncomment the line below to push this to Cloudant
module.exports = ddoc;