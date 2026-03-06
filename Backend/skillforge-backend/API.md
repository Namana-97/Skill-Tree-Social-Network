# SkillForge API Reference

Base URL: `http://localhost:3001/api`

---

## Auth

### POST `/auth/register`
```json
// Request
{ "username":"Namana","email":"namana@x.com","password":"secret","display_name":"Namana Kanchan","role_title":"Software Engineer" }

// Response 201
{ "token":"<jwt>", "user":{ "id":1,"username":"Namana","display_name":"Namana Kanchan",... } }
```

### POST `/auth/login`
```json
// Request
{ "email":"namana@x.com","password":"secret" }

// Response 200
{ "token":"<jwt>", "user":{...} }
```

### GET `/auth/me`  🔒
```json
// Headers: Authorization: Bearer <token>
// Response 200
{ "id":1,"username":"namana","display_name":"NAMANA Kanchan","level":34,"xp":3400,... }
```

---

## Profiles

### GET `/users/:userId/profile`
```json
// Response 200
{
  "user": { "id":1,"display_name":"NAMANA Kanchan","level":34,... },
  "skills": [{ "id":1,"name":"JavaScript","level":5,"color":"#E63B3B","vouch_count":12 },...],
  "total_vouches": 12
}
```

### GET `/discover?skill=React&sort=match&page=1&limit=20`
```
Query params:
  skill   — filter by skill name (partial match)
  role    — filter by role title
  sort    — "level" | "vouches" | "match" | "newest"
  page    — pagination (default 1)
  limit   — per page (default 20)

If Authorization header is included, each result gets a match_score.
```

---

## Skills

### GET `/users/:userId/skills`
```json
// Response 200
{
  "nodes": [{ "id":1,"name":"JavaScript","level":5,"color":"#E63B3B","vouch_count":12 }],
  "edges": [{ "id":1,"source":1,"target":2 }]
}
```

### POST `/skills`  🔒
```json
// Request
{ "name":"TypeScript","level":3,"color":"#1A7FC2","proof_url":"https://github.com/..." }

// Response 201
{ "id":6,"user_id":1,"name":"TypeScript","level":3,"color":"#1A7FC2",... }
```

### PUT `/skills/:skillId`  🔒
```json
// Request (any fields optional)
{ "level":4,"proof_url":"https://github.com/new-project" }
```

### DELETE `/skills/:skillId`  🔒
```json
// Response 200
{ "deleted": 6 }
```

### POST `/skills/edges`  🔒
```json
// Request
{ "source_skill_id":1, "target_skill_id":6 }

// Response 201
{ "id":5,"user_id":1,"source_skill_id":1,"target_skill_id":6 }
```

### DELETE `/skills/edges/:edgeId`  🔒
```json
{ "deleted": 5 }
```

---

## Vouches

### GET `/users/:userId/vouches`
```json
[{
  "id":1,"message":"Solid React fundamentals.",
  "skill_name":"React","skill_level":4,"color":"#5C3FB0",
  "voucher_name":"Sofia R.","avatar_initials":"SR",
  "created_at":"2025-01-01T..."
}]
```

### POST `/vouches`  🔒
```json
// Request
{ "skill_id": 2, "message": "I've seen this person's React work — excellent." }

// 403 if your level in that skill < theirs
// Response 201
{ "id":4,"voucher_id":5,"recipient_id":1,"skill_id":2,... }
```

### DELETE `/vouches/:vouchId`  🔒
```json
{ "deleted": 4 }
```

---

## Matching

### GET `/match/:userId?limit=10`
```json
[{
  "id":2,"display_name":"Lisa Park","role_title":"ML Engineer",
  "score":94,
  "fills_your_gaps": [{"name":"Python","level":5},{"name":"TensorFlow","level":4}],
  "you_fill_theirs":  [{"name":"React","level":4},{"name":"Docker","level":3}],
  "shared_skills":    [{"name":"SQL","level":3}],
  "vouch_count":18
}]
```

---

## Error Responses

All errors follow this shape:
```json
{ "error": "Human-readable message here." }
```

| Status | Meaning                        |
|--------|-------------------------------|
| 400    | Bad request / validation fail  |
| 401    | No/invalid token               |
| 403    | Forbidden (not owner / level)  |
| 404    | Not found                      |
| 409    | Conflict (duplicate)           |
| 429    | Rate limited                   |
| 500    | Server error                   |

---

🔒 = requires `Authorization: Bearer <token>` header
