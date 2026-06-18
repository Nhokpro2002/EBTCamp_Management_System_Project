const POCKETBASE_URL = "http://127.0.0.1:8090";


export async function createRecord(collection, data) {
    const token = localStorage.getItem("token");

    try {
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

    } catch (err) {
        console.error("createRecord error:", err);
        return null;
    }
}

export async function updateRecord(collection, id, data) {
    const token = localStorage.getItem("token");

    try {
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

    } catch (err) {
        console.error("updateRecord error:", err);
        return null;
    }
}

export async function deleteRecord(collection, id) {
    const token = localStorage.getItem("token");

    try {
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

    } catch (err) {
        console.error("deleteRecord error:", err);
        return false;
    }
}

export async function getRecords(collection) {

    const token = localStorage.getItem("token");

    try {
        let url = `${POCKETBASE_URL}/api/collections/${collection}/records`;

        const res = await fetch(url, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        if (!res.ok) throw new Error("Fetch failed");

        const data = await res.json();
        return data.items || [];

    } catch (err) {
        console.error(err);
        return [];
    }
}

export async function getRecordsFilter(collection, field, value) {
    const token = localStorage.getItem("token");

    try {
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

    } catch (err) {
        console.error(err);
        return [];
    }
}