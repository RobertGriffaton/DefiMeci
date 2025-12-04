"""from flask import Flask , render_template

app = Flask(__name__)

@app.route('/')

def welcome():
    return render_template("welcom.html")
@app.route('/bonjour/<string:name>')
def bonjour(name : str):
    return render_template('bonjour.html',name =name)"""

from flask import Flask, render_template, request, redirect, url_for, flash
from flask_login import LoginManager, UserMixin, login_user, login_required, logout_user, current_user
from werkzeug.security import generate_password_hash, check_password_hash
from flask_sqlalchemy import SQLAlchemy
import os

app = Flask(__name__)

# --- CONFIGURATION ---
# Une clé secrète est OBLIGATOIRE pour chiffrer les cookies de session
app.secret_key = 'super_secret_key_changez_moi' 

# Configuration de la base de données SQLite
# Le fichier sera créé dans le dossier 'instance/users.db'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///users.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Initialisation des extensions
db = SQLAlchemy(app)
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login' # Redirection auto si non connecté

# --- MODÈLE DE DONNÉES (La Table SQL) ---
class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(150), unique=True, nullable=False)
    password_hash = db.Column(db.String(150), nullable=False)

# --- FONCTION DE CHARGEMENT UTILISATEUR ---
@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

# --- CRÉATION AUTOMATIQUE DE LA BDD ---
# Au lancement, on vérifie si la BDD existe, sinon on la crée
with app.app_context():
    db.create_all()

# --- ROUTES ---

@app.route('/')
def home():
    return """
    <h1>Bienvenue</h1>
    <a href="/login">Se connecter</a> | <a href="/register">Créer un compte</a>
    """

# Route d'inscription
@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']

        # Vérifier si l'utilisateur existe déjà
        existing_user = User.query.filter_by(username=username).first()
        if existing_user:
            flash("Ce nom d'utilisateur existe déjà.")
            return redirect(url_for('register'))
        
        # Hachage du mot de passe (Sécurité)
        hashed_pw = generate_password_hash(password, method='scrypt')
        
        # Création et sauvegarde
        new_user = User(username=username, password_hash=hashed_pw)
        db.session.add(new_user)
        db.session.commit()
        
        flash('Compte créé avec succès ! Connectez-vous.')
        return redirect(url_for('login'))
        
    return render_template('register.html')

# Route de connexion
@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        
        user = User.query.filter_by(username=username).first()
        
        # Vérification du hash
        if user and check_password_hash(user.password_hash, password):
            login_user(user)
            return redirect(url_for('dashboard'))
        else:
            flash('Email ou mot de passe incorrect.')
            
    return render_template('login.html')

# Route protégée (Dashboard)
@app.route('/dashboard')
@login_required  # <-- Interdit l'accès si non connecté
def dashboard():
    return render_template('dashboard.html', name=current_user.username)

# Déconnexion
@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('login'))

if __name__ == '__main__':
    app.run(debug=True)