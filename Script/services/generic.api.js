import { URL_LOCAL } from "../config.js";

export async function createRecord(collection, data) {
    const token = localStorage.getItem("token");
    const isFormData = data instanceof FormData;
    const options = {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${token}`
        }
    };

    if (isFormData) {
        // Upload file
        options.body = data;
    } else {
        // JSON bình thường
        options.headers["Content-Type"] = "application/json";
        options.body = JSON.stringify(data);
    }

    const res = await fetch(
        `${URL_LOCAL}/api/collections/${collection}/records`,
        options
    );

    if (!res.ok) {
        throw new Error("Create failed");
    }

    return await res.json();
}

export async function login(collection, data) {
    const res = await fetch(
        `${URL_LOCAL}/api/collections/${collection}/auth-with-password`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        }
    );

    return res;
}

export async function updateRecord(collection, id, data) {
    const token = localStorage.getItem("token");
    const res = await fetch(
        `${URL_LOCAL}/api/collections/${collection}/records/${id}`,
        {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(data)
        }
    );
    if (!res.ok) throw new Error("Update failed");
    return await res.json();
}

export async function deleteRecord(collection, id) {
    const token = localStorage.getItem("token");
    const res = await fetch(
        `${URL_LOCAL}/api/collections/${collection}/records/${id}`,
        {
            method: "DELETE",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        }
    );
    if (!res.ok) throw new Error("Delete failed");
    return true;
}

export async function getRecords(collection) {
    const token = localStorage.getItem("token");
    let url = `${URL_LOCAL}/api/collections/${collection}/records`;
    const res = await fetch(url, {
        headers: {
            Authorization: `Bearer ${token}`
        }
    });
    if (!res.ok) throw new Error("Fetch failed");
    const data = await res.json();
    return data.items || [];
}

export async function getRecordsFilter(collection, field, value) {
    const token = localStorage.getItem("token");
    let url = `${URL_LOCAL}/api/collections/${collection}/records`;
    const filter = `${field} = "${value}"`;
    url += `?filter=${encodeURIComponent(filter)}`;
    const res = await fetch(url, {
        headers: {
            Authorization: `Bearer ${token}`
        }
    });
    if (!res.ok) throw new Error("Fetch failed");
    const data = await res.json();
    return data.items || [];
}

export async function loadInventoryItemEachPage(collection, page = 1, size = 7) {
    const token = localStorage.getItem("token");
    const res = await fetch(
        `${URL_LOCAL}/api/collections/${collection}/records?page=${page}&perPage=${size}`,
        {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        }
    );

    if (!res.ok) {
        throw new Error("Cannot load inventory items");
    }
    return await res.json();
}