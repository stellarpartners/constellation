# Constellation Studio CMS - API Reference

## Base URL
```
http://localhost:5000/api
```

---

## Overview Statistics

### GET /stats
Returns overall database statistics.

**Response:**
```json
{
  "total_journalists": 111,
  "total_outlets": 29,
  "total_relationships": 53
}
```

---

## Cross-Platform Journalists

### GET /cross-platform-journalists
Returns journalists who work at multiple media outlets.

**Response:**
```json
{
  "journalists": [
    {
      "id": 1,
      "name": "Syμέλα Τουχτίδου",
      "outlet_count": 2
    },
    {
      "id": 5,
      "name": "Katerina Papadopoulou",
      "outlet_count": 2
    }
  ]
}
```

---

## Top Media Outlets

### GET /top-outlets/<limit>
Returns top media outlets by journalist count. Default limit is 15.

**Example:** `GET /api/top-outlets/10`

**Response:**
```json
{
  "outlets": [
    {
      "id": 1,
      "name": "Vima",
      "journalist_count": 7
    },
    {
      "id": 2,
      "name": "Kathimerini",
      "journalist_count": 5
    }
  ]
}
```

---

## Journalist Profiles

### GET /journalists/<id>
Returns detailed profile of a specific journalist including their outlets.

**Example:** `GET /api/journalists/1`

**Response:**
```json
{
  "profile": {
    "id": 1,
    "name": "Syμέλα Τουχτίδου",
    "total_outlets": 2,
    "outlets_list": ["Kathimerini", "Vima"],
    "outlet_ids": [2, 1]
  },
  "navigation_links": [
    {
      "outlet_id": 2,
      "outlet_name": "Vima"
    },
    {
      "outlet_id": 1,
      "outlet_name": "Kathimerini"
    }
  ]
}
```

---

## Outlet Profiles

### GET /outlets/<id>
Returns detailed profile of a specific media outlet including their journalists.

**Example:** `GET /api/outlets/1`

**Response:**
```json
{
  "profile": {
    "id": 1,
    "name": "Vima",
    "total_journalists": 7,
    "journalists_list": ["John Doe", "Jane Smith"],
    "journalist_ids": [1, 2]
  },
  "navigation_links": [
    {
      "journalist_id": 1,
      "journalist_name": "John Doe"
    },
    {
      "journalist_id": 2,
      "journalist_name": "Jane Smith"
    }
  ]
}
```

---

## Search Endpoints

### GET /search/journalists/<query>
Searches journalists by name. Returns matching journalists with their outlet count.

**Example:** `GET /api/search/journalists/John`

**Response:**
```json
{
  "journalists": [
    {
      "id": 1,
      "name": "John Doe",
      "outlet_count": 3
    },
    {
      "id": 5,
      "name": "John Smith",
      "outlet_count": 2
    }
  ]
}
```

### GET /search/outlets/<query>
Searches media outlets by name. Returns matching outlets with their journalist count.

**Example:** `GET /api/search/outlets/Vima`

**Response:**
```json
{
  "outlets": [
    {
      "id": 1,
      "name": "Vima",
      "journalist_count": 7
    }
  ]
}
```

---

## Relationship Endpoints

### GET /relationships/<journalist_id>
Returns all media outlet relationships for a specific journalist.

**Example:** `GET /api/relationships/1`

**Response:**
```json
{
  "relationships": [
    {
      "outlet_id": 2,
      "outlet_name": "Vima",
      "role": "Staff"
    },
    {
      "outlet_id": 1,
      "outlet_name": "Kathimerini",
      "role": "Contributor"
    }
  ]
}
```

### GET /relationships/<outlet_id>
Returns all journalist relationships for a specific media outlet.

**Example:** `GET /api/relationships/1`

**Response:**
```json
{
  "relationships": [
    {
      "journalist_id": 1,
      "journalist_name": "John Doe",
      "role": "Staff"
    },
    {
      "journalist_id": 2,
      "journalist_name": "Jane Smith",
      "role": "Contributor"
    }
  ]
}
```

---

## Error Responses

### 404 Not Found
Entity not found.

**Response:**
```json
{
  "error": "Journalist not found"
}
```

### 500 Internal Server Error
Database query failed or unexpected error.

**Response:**
```json
{
  "error": "Failed to fetch data"
}
```

---

## Rate Limiting

Currently no rate limiting is implemented. For production use, consider adding rate limiting middleware.

---

## Authentication

Currently no authentication is required. For production use, implement JWT or session-based authentication.

---

## Data Format

All responses are in JSON format with UTF-8 encoding. All IDs are integers, all names are strings.

---

**Version**: 1.0.0  
**Last Updated**: April 2024
