# Welcome to the Future (WttF)

[demo]: http://lolcomingsoon.com

Like [My Life is Average](http://mylifeisaverage.com/), but for those moments of techno-{dys,u}topian elation, confusion, wonder, and disappointment. Example:

    "Can you keep a secret?" they asked.
    I replied, "You, me, and the NSA makes three."

N.B.: EXPERIMENTAL. Coming soon.

Built with love, and [Express-Cloudant](http://express-cloudant.herokuapp.com/) <3

## How does it work?

### When the app starts...

1. It checks to see if the `base`, `master`, and `_replicator` databases exist. If they don't, it creates them.
2. It checks to see if the `base` database is continuously replicating to `master`. If it isn't, it inserts a document into `_replicator` to begin that replication.

### When a user visits the homepage...

**In development**

1. They see recent posts, sorted by a function like `created_date * votes`, so popular posts sort higher, but ultimately float down as they age. (The specifics: The most recent 20 posts are sorted by votes * timestamp. TODO: Make it Reddit-like sorting, rather than this hogwash)
2. If an anonymous user tries to vote or post, they're prompted with a signup form.

### When a user signs up...

1. Server adds that to a `_users` database. (If the user already exists, reject the signup)
2. Server creates a database called `user_{username}`
3. Server sets the security on the database to give the user `_reader` and `_writer` permissions.
4. Server adds a doc to the `_replicator` database to continuously replicate the `setup` database to the new user's database.
5. Server adds a doc to the `_replicator` database to continuously replicate the user's database to the `master` database.

### When a user adds a post...

1. The user writes the `post` document to their `user_{username}` database.
2. It gets replicated to the `master` database, where others can vote on it.

A post looks like this:

    {
        type: 'post',
        created_at: timestamp,
        text: content_of_post_in_markdown,
        user: username
    }

A `validate_doc_update` ensures that the document being inserted is up to spec. For example:

* `type` must equal 'post'.
* Users cannot set the `user` field to anything but their own usernames.
* The JavaScript `Date` function must be able to parse `created_at`.
* `text` cannot be empty.

### When a user casts a vote...

1. The user writes the `vote` document to their `user_{username}` database.
2. It gets replicated to the `master` database, where it affects the sorting of recent posts.

A vote looks like this:

    {
        _id: {username}-{post_id},
        type: 'vote',
        user: username,
        post: post_id
    }

The `_id` ensures that there is only one vote per username-post pair, so folks can't vote on something more than once. A `validate_doc_update` function further ensures conformity:

* `type` must equal 'vote'.
* `_id` must split at the rightmost hyphen such that the substring left of the split is the submitting user's username, and the substring right of the split is equal to `post`.
* `user` must equal the submitting user's username.

## License

[MIT](http://opensource.org/licenses/MIT), yo.
