import { initializeApp } from 'https://www.gstatic.com/firebasejs/13.3.0/firebase-app.js';
import {
    GoogleAuthProvider,
    getAuth,
    onAuthStateChanged,
    signInWithPopup,
    signOut
} from 'https://www.gstatic.com/firebasejs/13.3.0/firebase-auth.js';
import { doc, getDoc, getFirestore, setDoc } from 'https://www.gstatic.com/firebasejs/13.3.0/firebase-firestore.js';
import { ADMIN_EMAIL, firebaseConfig } from './firebase-config.js';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();
const loginView = document.querySelector('#login-view');
const adminView = document.querySelector('#admin-view');
const form = document.querySelector('#content-form');
const promotionsFields = document.querySelector('#promotions-fields');
const loginError = document.querySelector('#login-error');
const saveMessage = document.querySelector('#save-message');

const defaultContent = {
    site: {
        title: 'Auténtico Helado Artesanal',
        subtitle: 'La tradición y el sabor intenso que nos caracteriza.'
    },
    prices: {
        counter: { quarter: 7200, half: 11400, threeQuarter: 16800, kilo: 20000, smallCup: 3600, mediumCup: 3800, tacita: 4200, cone: 6300 },
        delivery: { quarter: 8000, half: 14000, threeQuarter: 19200, kilo: 23000 }
    },
    hours: { tueThu: '15:00 a 23:00 hs', fri: '16:00 a 23:00 hs', sat: '16:00 a 00:00 hs', sun: '13:00 a 23:00 hs' },
    promotions: [
        { title: '10% de descuento', description: 'Pagando en efectivo en el local.' },
        { title: '2 kg por $34.000', description: 'En mostrador, con cualquier medio de pago.' },
        { title: '2 kg por $39.000', description: 'Promoción exclusiva de PedidosYa.' }
    ],
    flavors: []
};

function setField(name, value) {
    const field = form.elements[name];
    if (field) field.value = value ?? '';
}

function populateForm(content) {
    const data = { ...defaultContent, ...content, prices: { ...defaultContent.prices, ...content.prices }, hours: { ...defaultContent.hours, ...content.hours } };
    setField('siteTitle', data.site.title);
    setField('siteSubtitle', data.site.subtitle);
    Object.entries(data.prices.counter).forEach(([key, value]) => setField(`counter${key[0].toUpperCase()}${key.slice(1)}`, value));
    Object.entries(data.prices.delivery).forEach(([key, value]) => setField(`delivery${key[0].toUpperCase()}${key.slice(1)}`, value));
    setField('hoursTueThu', data.hours.tueThu);
    setField('hoursFri', data.hours.fri);
    setField('hoursSat', data.hours.sat);
    setField('hoursSun', data.hours.sun);
    promotionsFields.innerHTML = data.promotions.map((promotion, index) => `
        <div class="promotion-editor">
            <label>Título ${index + 1}<input name="promotionTitle${index}" value="${escapeAttribute(promotion.title)}" required></label>
            <label>Descripción ${index + 1}<input name="promotionDescription${index}" value="${escapeAttribute(promotion.description)}" required></label>
        </div>`).join('');
    setField('flavors', JSON.stringify(data.flavors, null, 2));
}

function escapeAttribute(value) {
    return String(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
}

function readNumber(name) {
    return Number(form.elements[name].value);
}

function readContent() {
    let flavors;
    try {
        flavors = JSON.parse(form.elements.flavors.value);
        if (!Array.isArray(flavors)) throw new Error('Los sabores deben ser un array JSON.');
    } catch (error) {
        throw new Error(`JSON de sabores inválido: ${error.message}`);
    }

    return {
        site: { title: form.elements.siteTitle.value.trim(), subtitle: form.elements.siteSubtitle.value.trim() },
        prices: {
            counter: {
                quarter: readNumber('counterQuarter'), half: readNumber('counterHalf'), threeQuarter: readNumber('counterThreeQuarter'),
                kilo: readNumber('counterKilo'), smallCup: readNumber('counterSmallCup'), mediumCup: readNumber('counterMediumCup'),
                tacita: readNumber('counterTacita'), cone: readNumber('counterCone')
            },
            delivery: {
                quarter: readNumber('deliveryQuarter'), half: readNumber('deliveryHalf'),
                threeQuarter: readNumber('deliveryThreeQuarter'), kilo: readNumber('deliveryKilo')
            }
        },
        hours: {
            tueThu: form.elements.hoursTueThu.value.trim(), fri: form.elements.hoursFri.value.trim(),
            sat: form.elements.hoursSat.value.trim(), sun: form.elements.hoursSun.value.trim()
        },
        promotions: [0, 1, 2].map((index) => ({
            title: form.elements[`promotionTitle${index}`].value.trim(),
            description: form.elements[`promotionDescription${index}`].value.trim()
        })),
        flavors
    };
}

document.querySelector('#login-button').addEventListener('click', async () => {
    loginError.textContent = '';
    try {
        await signInWithPopup(auth, provider);
    } catch (error) {
        loginError.textContent = `No se pudo iniciar sesión: ${error.message}`;
    }
});

document.querySelector('#logout-button').addEventListener('click', () => signOut(auth));

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        loginView.hidden = false;
        adminView.hidden = true;
        return;
    }
    if (user.email !== ADMIN_EMAIL) {
        loginError.textContent = 'Esta cuenta no tiene permisos de administrador.';
        await signOut(auth);
        return;
    }
    loginView.hidden = true;
    adminView.hidden = false;
    const snapshot = await getDoc(doc(db, 'site', 'content'));
    populateForm(snapshot.exists() ? snapshot.data() : defaultContent);
});

form.addEventListener('submit', async (event) => {
    event.preventDefault();
    saveMessage.textContent = '';
    try {
        await setDoc(doc(db, 'site', 'content'), readContent());
        saveMessage.textContent = 'Cambios guardados y publicados.';
    } catch (error) {
        saveMessage.textContent = `No se pudo guardar: ${error.message}`;
    }
});
