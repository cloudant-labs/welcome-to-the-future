var couchapp = require('couchapp');

ddoc = {
    // name of the design doc
    _id: '_design/queries',
    views: {
      // view code goes here
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
          } else if (new Date(newDoc.created_at).getTime() === NaN) {
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
          break;
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