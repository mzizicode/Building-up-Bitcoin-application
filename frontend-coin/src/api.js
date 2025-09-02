// src/api.js
const API = {
    base: process.env.REACT_APP_API_BASE || 'http://localhost:8080',

    async submitPhoto(file, description, token) {
        const form = new FormData();
        form.append('file', file);
        form.append('description', description ?? '');

        const res = await fetch(`${this.base}/api/photos/submit`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: form,
        });
        if (!res.ok) throw new Error(await res.text());
        return res.json();
    },

    async getUserStats(token) {
        const res = await fetch(`${this.base}/api/photos/user-stats`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(await res.text());
        return res.json();
    },

    async getUserPhotos(userId, token) {
        const res = await fetch(`${this.base}/api/photos/user/${userId}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(await res.text());
        return res.json();
    },

    async getWallet(token) {
        // adjust if your WalletController uses a different path
        const res = await fetch(`${this.base}/api/wallet/me`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(await res.text());
        return res.json(); // expect {balance, transactions:[...]}
    }
};

export default API;
