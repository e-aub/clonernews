const pageSize = 25
let currentPage = 0
let lastID = null
let existedPosts = new Set()


async function fetchFunc(url) {
    const response = await fetch('https://hacker-news.firebaseio.com/v0' + url)
    return await response.json()
}

async function fetchData() {
    const loadElement = document.getElementById("loading")

    loadElement.style.display = 'block'
    const postIds = await fetchFunc('/newstories.json')
    if (currentPage === 0) {
        lastID = postIds[0]
    }

    const start = currentPage * pageSize
    const end = start + pageSize
    const pageIDs = postIds.slice(start, end);

    const posts = await Promise.all(
        pageIDs.filter(id => !existedPosts.has(id))
            .map(id => fetchFunc(`/item/${id}.json`))
    )

    posts.filter(post => !post.deleted).forEach(post => {
        existedPosts.add(post.id)
        displayData(post)
    })

    currentPage++
    loadElement.style.display = 'none'
}

function displayData(post) {
    if (!post || !post.title) return

    const list = document.createElement('li')
    list.className = 'post'

    list.innerHTML = `
        <a href="${post.url}" class="post-title" target="_blank">
            <label>${post.title}</label>
            <label>${post.type}</label>
        </a>
        <div class="post-meta">
            ${post.score} points | by ${post.by} | ${timeConverter(post.time)}
            ${post.descendants ? `| ${post.descendants} comments` : ''}
        </div>
        <div class="comments" id="comments-${post.id}"></div>
    `
    document.getElementById('posts').appendChild(list)
    if (post.descendants > 0) loadComments(post.id)
}

function timeConverter(timeGiven) {
    const time = Math.floor((Date.now() / 1000) - timeGiven)
    const intervals = {
        year: 31536000,
        month: 2592000,
        week: 604800,
        day: 86400,
        hour: 3600,
        minute: 60
    }

    for (const [unit, seconds] of Object.entries(intervals)) {
        const interval = Math.floor(time / seconds)
        if (interval >= 1) {
            return `${interval} ${unit}${interval === 1 ? '' : 's'} ago`
        }
    }
    return 'just now';
}

async function loadComments(postId) {
    const post = await fetchFunc(`/item/${postId}.json`)
    if (!post.kids) return

    const commentElement = document.getElementById(`comments-${postId}`)
    if (!commentElement) return

    const comments = await Promise.all(
        post.kids.slice(0, 5).map(id => fetchFunc(`/item/${id}.json`))
    )

    commentElement.innerHTML = comments.filter(comment => !comment.deleted)
        .map(comment => `
            <div class="comment">
                ${comment.text}
                <div class="post-meta">
                    by ${comment.by} | ${timeConverter(comment.time)}
                </div>
            </div>
        `).join('')
}

document.getElementById('newPostMessage').addEventListener('click', () => {
    currentPage = 0
    existedPosts.clear()
    document.getElementById('posts').innerHTML = ''
    document.getElementById('newPostMessage').style.display = 'none'
    fetchData()
})

window.addEventListener('scroll', throttle(() => {
    if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 1000) {
        fetchData()
    }
}, 250))

function throttle(func, delay) {
    let timer = null
    return function (...args) {
        if (!timer) {
            func(...args)
        }
        timer = setTimeout(() => timer = null, delay)
    }
}

async function checkNewPosts() {
    const posts = await fetchFunc('/newstories.json');
    const latestId = posts[0];

    if (latestId > lastID) {
        document.getElementById('newPostMessage').style.display = 'block';
    }
}

fetchData()
setInterval(checkNewPosts, 5000)