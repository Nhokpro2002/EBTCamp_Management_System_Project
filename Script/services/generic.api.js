const POCKETBASE_URL = "http://127.0.0.1:8090";

export async function createRecord(collection, data) {
    const token = localStorage.getItem("token");
    const res = await fetch(
        `${POCKETBASE_URL}/api/collections/${collection}/records`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(data)
        }
    );

    if (!res.ok) throw new Error("Create failed");

    return await res.json();

}

export async function updateRecord(collection, id, data) {
    const token = localStorage.getItem("token");
    const res = await fetch(
        `${POCKETBASE_URL}/api/collections/${collection}/records/${id}`,
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
        `${POCKETBASE_URL}/api/collections/${collection}/records/${id}`,
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

    let url = `${POCKETBASE_URL}/api/collections/${collection}/records`;

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

    let url = `${POCKETBASE_URL}/api/collections/${collection}/records`;

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