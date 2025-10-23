import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import { DollarSign, Package, Users, Moon, Sun, LogOut, History } from 'lucide-react';

const GTARPManager = () => {
  const [currentPage, setCurrentPage] = useState('comptabilite');
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  
  // États pour la comptabilité
  const [solde, setSolde] = useState(50000);
  const [historique, setHistorique] = useState([]);
  const [montant, setMontant] = useState('');
  const [motif, setMotif] = useState('');
  const [typeTransaction, setTypeTransaction] = useState('entree');
  
  // États pour l'inventaire
  const [inventaire, setInventaire] = useState([
    { id: 1, nom: 'Armes', quantite: 45, prix: 1500 },
    { id: 2, nom: 'Munitions', quantite: 250, prix: 50 },
    { id: 3, nom: 'Gilets pare-balles', quantite: 30, prix: 800 },
    { id: 4, nom: 'Lockpicks', quantite: 15, prix: 200 }
  ]);
  const [nouvelItem, setNouvelItem] = useState({ nom: '', quantite: '', prix: '' });
  const [editingItem, setEditingItem] = useState(null);
  
  // États pour les clients
  const [clients, setClients] = useState([
    { id: 1, nom: 'Marcus Rivers', groupe: 'Ballas', business: 'Trafic armes' },
    { id: 2, nom: 'Sofia Martinez', groupe: 'Vagos', business: 'Blanchiment' },
    { id: 3, nom: 'Trevor Wilson', groupe: 'Indépendant', business: 'Protection' }
  ]);
  const [nouveauClient, setNouveauClient] = useState({ nom: '', groupe: '', business: '' });
  const [editingClient, setEditingClient] = useState(null);

  // Supabase client (requires REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_KEY in Vercel env)
  const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
  const supabaseKey = process.env.REACT_APP_SUPABASE_KEY;
  const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

  // Discord webhook (client-side only if you understand the risks of exposing the webhook URL)
  // Prefer storing webhook and calling a server-side endpoint to keep the webhook secret.
  const envoyerDiscord = async (message) => {
    const webhook = process.env.REACT_APP_DISCORD_WEBHOOK_URL;
    if (!webhook) return;
    try {
      await axios.post(webhook, {
        embeds: [{
          title: 'Nouvelle transaction',
          description: message,
          color: 0x5865F2
        }]
      });
    } catch (err) {
      console.error('Erreur en envoyant le webhook Discord:', err);
    }
  };

  /* Google Sheets integration - TODO: Implement when backend is ready
   * This function will be used to sync transactions with Google Sheets via a server endpoint
   * Required env: REACT_APP_GOOGLE_SHEETS_ENDPOINT
   * Example usage:
   *   await sendToGoogleSheets({ date: trans.date, amount: trans.montant, type: trans.type });
   */
  // eslint-disable-next-line no-unused-vars
  const sendToGoogleSheets = async (rowData) => {
    try {
      await axios.post(process.env.REACT_APP_GOOGLE_SHEETS_ENDPOINT || '/api/sheets', { row: rowData });
    } catch (err) {
      console.error('Erreur Google Sheets:', err);
    }
  };

  // Charger les données au démarrage
  useEffect(() => {
    const savedData = localStorage.getItem('gtaRpData');
    if (savedData) {
      const data = JSON.parse(savedData);
      setSolde(data.solde || 50000);
      setHistorique(data.historique || []);
      setInventaire(prev => data.inventaire || prev);
      setClients(prev => data.clients || prev);
    }
  }, []); // Vide car on veut juste charger au montage, et on utilise des updaters fonctionnels

  // Sauvegarder automatiquement
  useEffect(() => {
    if (isLoggedIn) {
      const data = { solde, historique, inventaire, clients };
      localStorage.setItem('gtaRpData', JSON.stringify(data));
    }
  }, [solde, historique, inventaire, clients, isLoggedIn]);

  // Connexion
  const handleLogin = (e) => {
    e.preventDefault();
    if (username === 'admin' && password === 'demo123') {
      setIsLoggedIn(true);
      showNotification('Connexion réussie', 'success');
    } else {
      showNotification('Identifiants incorrects', 'error');
    }
  };

  // Notification système
  const showNotification = (message, type) => {
    // Simulation de notification
    console.log(`[${type.toUpperCase()}] ${message}`);
  };

  // Gestion comptabilité
  const ajouterTransaction = async () => {
    if (!montant || !motif) {
      showNotification('Veuillez remplir tous les champs', 'error');
      return;
    }

    const montantNum = parseFloat(montant);
    const newSolde = typeTransaction === 'entree' 
      ? solde + montantNum 
      : solde - montantNum;

    const transaction = {
      id: Date.now(),
      date: new Date().toLocaleString('fr-FR'),
      type: typeTransaction,
      montant: montantNum,
      motif,
      soldeApres: newSolde
    };

    setSolde(newSolde);
    setHistorique([transaction, ...historique]);
    setMontant('');
    setMotif('');
    showNotification(`Transaction ${typeTransaction === 'entree' ? 'ajoutée' : 'retirée'} avec succès`, 'success');

    // Persist to Supabase if configured
    if (supabase) {
      try {
        await supabase.from('transactions').insert([{
          date: transaction.date,
          type: transaction.type,
          montant: transaction.montant,
          motif: transaction.motif,
          solde_apres: transaction.soldeApres
        }]);
      } catch (err) {
        console.error('Erreur Supabase:', err);
      }
    }

    // Send Discord webhook (if configured)
    envoyerDiscord(`${typeTransaction === 'entree' ? '+' : '-'}${montantNum} — ${motif}`);
  };

  // Gestion inventaire
  const ajouterItem = () => {
    if (!nouvelItem.nom || !nouvelItem.quantite || !nouvelItem.prix) {
      showNotification('Veuillez remplir tous les champs', 'error');
      return;
    }

    const newItem = {
      id: Date.now(),
      nom: nouvelItem.nom,
      quantite: parseInt(nouvelItem.quantite),
      prix: parseFloat(nouvelItem.prix)
    };

    setInventaire([...inventaire, newItem]);
    setNouvelItem({ nom: '', quantite: '', prix: '' });
    showNotification('Article ajouté à l\'inventaire', 'success');
  };

  const modifierItem = (id, field, value) => {
    setInventaire(inventaire.map(item => 
      item.id === id ? { ...item, [field]: field === 'nom' ? value : parseFloat(value) || 0 } : item
    ));
    showNotification('Article modifié', 'success');
  };

  const supprimerItem = (id) => {
    setInventaire(inventaire.filter(item => item.id !== id));
    showNotification('Article supprimé', 'success');
  };

  // Gestion clients
  const ajouterClient = () => {
    if (!nouveauClient.nom || !nouveauClient.groupe || !nouveauClient.business) {
      showNotification('Veuillez remplir tous les champs', 'error');
      return;
    }

    const newClient = {
      id: Date.now(),
      ...nouveauClient
    };

    setClients([...clients, newClient]);
    setNouveauClient({ nom: '', groupe: '', business: '' });
    showNotification('Client ajouté', 'success');
  };

  const modifierClient = (id, field, value) => {
    setClients(clients.map(client => 
      client.id === id ? { ...client, [field]: value } : client
    ));
    showNotification('Client modifié', 'success');
  };

  const supprimerClient = (id) => {
    setClients(clients.filter(client => client.id !== id));
    showNotification('Client supprimé', 'success');
  };

  // Page de connexion
  if (!isLoggedIn) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDarkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
        <div className={`w-full max-w-md p-8 card ${
          isDarkMode 
            ? 'bg-gray-800/40 border border-gray-700/50 shadow-2xl shadow-purple-500/20' 
            : 'bg-white/60 border border-gray-300/50 shadow-xl'
        }`}>
          <div className="text-center mb-8">
            <h1 className={`text-3xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              GTA RP Manager
            </h1>
            <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Gestion d'Organisation - Version Démo
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className={`block mb-2 text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Identifiant
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className={`w-full px-4 py-3 rounded-lg backdrop-blur-sm ${
                  isDarkMode 
                    ? 'bg-gray-700/50 border-gray-600 text-white placeholder-gray-400' 
                    : 'bg-white/70 border-gray-300 text-gray-900'
                } border focus:outline-none focus:ring-2 focus:ring-purple-500`}
                placeholder="admin"
              />
            </div>

            <div>
              <label className={`block mb-2 text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Mot de passe
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full px-4 py-3 rounded-lg backdrop-blur-sm ${
                  isDarkMode 
                    ? 'bg-gray-700/50 border-gray-600 text-white placeholder-gray-400' 
                    : 'bg-white/70 border-gray-300 text-gray-900'
                } border focus:outline-none focus:ring-2 focus:ring-purple-500`}
                placeholder="demo123"
              />
            </div>

            <button
              type="submit"
              className="btn-primary w-full font-semibold"
            >
              Se connecter
            </button>
          </form>

          <div className={`mt-6 p-4 rounded-lg ${isDarkMode ? 'bg-gray-700/30' : 'bg-blue-50'}`}>
            <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              <strong>Démo :</strong> admin / demo123
            </p>
          </div>

          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className={`mt-4 w-full py-2 rounded-lg ${
              isDarkMode ? 'bg-gray-700/50 text-gray-300' : 'bg-gray-200 text-gray-700'
            } flex items-center justify-center gap-2 hover:opacity-80 transition-opacity`}
          >
            {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            {isDarkMode ? 'Mode Clair' : 'Mode Sombre'}
          </button>
        </div>
      </div>
    );
  }

  // Interface principale
  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
      {/* Header */}
      <header className={`sticky top-0 z-50 backdrop-blur-md ${
        isDarkMode 
          ? 'bg-gray-800/70 border-b border-gray-700/50' 
          : 'bg-white/70 border-b border-gray-300/50'
      } shadow-lg`}>
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              GTA RP Manager
            </h1>
            
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setIsDarkMode(!isDarkMode)}
                    className={`p-2 rounded-lg ${
                      isDarkMode ? 'bg-gray-700/50 text-gray-300' : 'bg-gray-200 text-gray-700'
                    } hover:opacity-80 transition-opacity`}
                    aria-label="Toggle theme"
                  >
                    {isDarkMode ? <Sun className="w-6 h-6" /> : <Moon className="w-6 h-6" />}
                  </button>
              
                  <button
                    onClick={() => {
                      setIsLoggedIn(false);
                      setUsername('');
                      setPassword('');
                    }}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600/80 text-white hover:bg-red-700 transition-colors"
                  >
                    <LogOut className="w-5 h-5" />
                    Déconnexion
                  </button>
                </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar Navigation */}
        <aside className={`w-64 min-h-screen sticky top-16 backdrop-blur-md ${
          isDarkMode ? 'bg-gray-800/50 border-r border-gray-700/50' : 'bg-white/50 border-r border-gray-300/50'
        }`}>
          <nav className="p-4 space-y-2">
            {[
              { id: 'comptabilite', icon: DollarSign, label: 'Comptabilité' },
              { id: 'inventaire', icon: Package, label: 'Inventaire' },
              { id: 'clients', icon: Users, label: 'Clients' }
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setCurrentPage(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 ${
                  currentPage === item.id
                    ? isDarkMode
                      ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg shadow-purple-500/30'
                      : 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg'
                    : isDarkMode
                    ? 'text-gray-400 hover:bg-gray-700/50'
                    : 'text-gray-600 hover:bg-gray-200/50'
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </button>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          <div className="max-w-7xl mx-auto">
            
            {/* MODULE COMPTABILITÉ */}
            {currentPage === 'comptabilite' && (
              <div className="space-y-6">
                <div className={`p-8 rounded-2xl card ${
                  isDarkMode 
                    ? 'bg-gradient-to-br from-purple-900/30 to-blue-900/30 border border-purple-500/30 shadow-2xl shadow-purple-500/20'
                    : 'bg-gradient-to-br from-purple-100 to-blue-100 border border-purple-300 shadow-xl'
                }`}>
                  <h2 className={`text-3xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    Solde Global
                  </h2>
                  <p className={`text-5xl font-bold ${solde >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    ${solde.toLocaleString('fr-FR')}
                  </p>
                </div>

                <div className={`p-6 rounded-2xl card ${
                  isDarkMode 
                    ? 'bg-gray-800/40 border border-gray-700/50'
                    : 'bg-white/60 border border-gray-300/50'
                }`}>
                  <h3 className={`text-xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    Nouvelle Transaction
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className={`block mb-2 text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Type
                      </label>
                      <select
                        value={typeTransaction}
                        onChange={(e) => setTypeTransaction(e.target.value)}
                        className={`w-full px-4 py-2 rounded-lg ${
                          isDarkMode 
                            ? 'bg-gray-700/50 border-gray-600 text-white' 
                            : 'bg-white border-gray-300 text-gray-900'
                        } border focus:outline-none focus:ring-2 focus:ring-purple-500`}
                      >
                        <option value="entree">Entrée (+)</option>
                        <option value="sortie">Sortie (-)</option>
                      </select>
                    </div>

                    <div>
                      <label className={`block mb-2 text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Montant
                      </label>
                      <input
                        type="number"
                        value={montant}
                        onChange={(e) => setMontant(e.target.value)}
                        className={`w-full px-4 py-2 rounded-lg ${
                          isDarkMode 
                            ? 'bg-gray-700/50 border-gray-600 text-white' 
                            : 'bg-white border-gray-300 text-gray-900'
                        } border focus:outline-none focus:ring-2 focus:ring-purple-500`}
                        placeholder="5000"
                      />
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className={`block mb-2 text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Motif
                    </label>
                    <textarea
                      value={motif}
                      onChange={(e) => setMotif(e.target.value)}
                      className={`w-full px-4 py-2 rounded-lg ${
                        isDarkMode 
                          ? 'bg-gray-700/50 border-gray-600 text-white' 
                          : 'bg-white border-gray-300 text-gray-900'
                      } border focus:outline-none focus:ring-2 focus:ring-purple-500`}
                      rows="3"
                      placeholder="Vente d'armes à Marcus Rivers..."
                    />
                  </div>

                  <button
                    onClick={ajouterTransaction}
                    className="btn-primary w-full"
                  >
                    Ajouter la transaction
                  </button>
                </div>

                <div className={`p-6 rounded-2xl card ${
                  isDarkMode 
                    ? 'bg-gray-800/40 border border-gray-700/50'
                    : 'bg-white/60 border border-gray-300/50'
                }`}>
                  <h3 className={`text-xl font-bold mb-4 flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    <History className="w-5 h-5" />
                    Historique des transactions
                  </h3>
                  
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {historique.length === 0 ? (
                      <p className={`text-center py-8 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                        Aucune transaction pour le moment
                      </p>
                    ) : (
                      historique.map((trans) => (
                        <div
                          key={trans.id}
                          className={`p-4 rounded-lg ${
                            isDarkMode ? 'bg-gray-700/30' : 'bg-gray-50'
                          } border-l-4 ${
                            trans.type === 'entree' ? 'border-green-500' : 'border-red-500'
                          }`}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                              {trans.date}
                            </span>
                            <span className={`font-bold ${trans.type === 'entree' ? 'text-green-400' : 'text-red-400'}`}>
                              {trans.type === 'entree' ? '+' : '-'}${trans.montant.toLocaleString('fr-FR')}
                            </span>
                          </div>
                          <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            {trans.motif}
                          </p>
                          <p className={`text-xs mt-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                            Solde après: ${trans.soldeApres.toLocaleString('fr-FR')}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* MODULE INVENTAIRE */}
            {currentPage === 'inventaire' && (
              <div className="space-y-6">
                <div className={`p-6 rounded-2xl card backdrop-blur-md ${
                  isDarkMode 
                    ? 'bg-gray-800/40 border border-gray-700/50'
                    : 'bg-white/60 border border-gray-300/50'
                }`}>
                  <h3 className={`text-xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    Ajouter un article
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <input
                      type="text"
                      value={nouvelItem.nom}
                      onChange={(e) => setNouvelItem({...nouvelItem, nom: e.target.value})}
                      className={`px-4 py-2 rounded-lg ${
                        isDarkMode 
                          ? 'bg-gray-700/50 border-gray-600 text-white' 
                          : 'bg-white border-gray-300 text-gray-900'
                      } border focus:outline-none focus:ring-2 focus:ring-purple-500`}
                      placeholder="Nom de l'article"
                    />
                    <input
                      type="number"
                      value={nouvelItem.quantite}
                      onChange={(e) => setNouvelItem({...nouvelItem, quantite: e.target.value})}
                      className={`px-4 py-2 rounded-lg ${
                        isDarkMode 
                          ? 'bg-gray-700/50 border-gray-600 text-white' 
                          : 'bg-white border-gray-300 text-gray-900'
                      } border focus:outline-none focus:ring-2 focus:ring-purple-500`}
                      placeholder="Quantité"
                    />
                    <input
                      type="number"
                      value={nouvelItem.prix}
                      onChange={(e) => setNouvelItem({...nouvelItem, prix: e.target.value})}
                      className={`px-4 py-2 rounded-lg ${
                        isDarkMode 
                          ? 'bg-gray-700/50 border-gray-600 text-white' 
                          : 'bg-white border-gray-300 text-gray-900'
                      } border focus:outline-none focus:ring-2 focus:ring-purple-500`}
                      placeholder="Prix de revente"
                    />
                  </div>

                  <button
                    onClick={ajouterItem}
                    className="btn-primary w-full"
                  >
                    Ajouter à l'inventaire
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {inventaire.map((item) => (
                    <div
                      key={item.id}
                      className={`p-6 rounded-2xl card ${
                        isDarkMode 
                          ? 'bg-gray-800/40 border border-gray-700/50 hover:border-purple-500/50'
                          : 'bg-white/60 border border-gray-300/50 hover:border-purple-500/50'
                      } transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/20`}
                    >
                      {editingItem === item.id ? (
                        <div className="space-y-3">
                          <input
                            type="text"
                            defaultValue={item.nom}
                            onBlur={(e) => modifierItem(item.id, 'nom', e.target.value)}
                            className={`w-full px-3 py-2 rounded-lg ${
                              isDarkMode ? 'bg-gray-700/50 text-white' : 'bg-white text-gray-900'
                            } border border-gray-600`}
                          />
                          <input
                            type="number"
                            defaultValue={item.quantite}
                            onBlur={(e) => modifierItem(item.id, 'quantite', e.target.value)}
                            className={`w-full px-3 py-2 rounded-lg ${
                              isDarkMode ? 'bg-gray-700/50 text-white' : 'bg-white text-gray-900'
                            } border border-gray-600`}
                          />
                          <input
                            type="number"
                            defaultValue={item.prix}
                            onBlur={(e) => modifierItem(item.id, 'prix', e.target.value)}
                            className={`w-full px-3 py-2 rounded-lg ${
                              isDarkMode ? 'bg-gray-700/50 text-white' : 'bg-white text-gray-900'
                            } border border-gray-600`}
                          />
                          <button
                            onClick={() => setEditingItem(null)}
                            className="w-full py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                          >
                            Valider
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-start justify-between mb-4">
                            <h4 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                              {item.nom}
                            </h4>
                            <Package className={`w-6 h-6 ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`} />
                          </div>
                          
                          <div className="space-y-2 mb-4">
                            <div className={`flex justify-between ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                              <span>Quantité:</span>
                              <span className="font-semibold">{item.quantite}</span>
                            </div>
                            <div className={`flex justify-between ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                              <span>Prix:</span>
                              <span className="font-semibold text-green-400">${item.prix}</span>
                            </div>
                            <div className={`flex justify-between ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                              <span>Valeur totale:</span>
                              <span className="font-semibold text-blue-400">
                                ${(item.quantite * item.prix).toLocaleString('fr-FR')}
                              </span>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <button
                              onClick={() => setEditingItem(item.id)}
                              className="flex-1 py-2 bg-blue-600/80 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                            >
                              Modifier
                            </button>
                            <button
                              onClick={() => supprimerItem(item.id)}
                              className="flex-1 py-2 bg-red-600/80 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                            >
                              Supprimer
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>

                <div className={`p-6 rounded-2xl card backdrop-blur-md ${
                  isDarkMode 
                    ? 'bg-gradient-to-br from-purple-900/30 to-blue-900/30 border border-purple-500/30'
                    : 'bg-gradient-to-br from-purple-100 to-blue-100 border border-purple-300'
                }`}>
                  <h3 className={`text-xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    Valeur totale de l'inventaire
                  </h3>
                  <p className={`text-3xl font-bold ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                    ${inventaire.reduce((total, item) => total + (item.quantite * item.prix), 0).toLocaleString('fr-FR')}
                  </p>
                </div>
              </div>
            )}

            {/* MODULE CLIENTS */}
            {currentPage === 'clients' && (
              <div className="space-y-6">
                <div className={`p-6 rounded-2xl card backdrop-blur-md ${
                  isDarkMode 
                    ? 'bg-gray-800/40 border border-gray-700/50'
                    : 'bg-white/60 border border-gray-300/50'
                }`}>
                  <h3 className={`text-xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    Ajouter un client
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <input
                      type="text"
                      value={nouveauClient.nom}
                      onChange={(e) => setNouveauClient({...nouveauClient, nom: e.target.value})}
                      className={`px-4 py-2 rounded-lg ${
                        isDarkMode 
                          ? 'bg-gray-700/50 border-gray-600 text-white' 
                          : 'bg-white border-gray-300 text-gray-900'
                      } border focus:outline-none focus:ring-2 focus:ring-purple-500`}
                      placeholder="Nom du client"
                    />
                    <input
                      type="text"
                      value={nouveauClient.groupe}
                      onChange={(e) => setNouveauClient({...nouveauClient, groupe: e.target.value})}
                      className={`px-4 py-2 rounded-lg ${
                        isDarkMode 
                          ? 'bg-gray-700/50 border-gray-600 text-white' 
                          : 'bg-white border-gray-300 text-gray-900'
                      } border focus:outline-none focus:ring-2 focus:ring-purple-500`}
                      placeholder="Groupe"
                    />
                    <input
                      type="text"
                      value={nouveauClient.business}
                      onChange={(e) => setNouveauClient({...nouveauClient, business: e.target.value})}
                      className={`px-4 py-2 rounded-lg ${
                        isDarkMode 
                          ? 'bg-gray-700/50 border-gray-600 text-white' 
                          : 'bg-white border-gray-300 text-gray-900'
                      } border focus:outline-none focus:ring-2 focus:ring-purple-500`}
                      placeholder="Type de business"
                    />
                  </div>

                  <button
                    onClick={ajouterClient}
                    className="btn-primary w-full"
                  >
                    Ajouter le client
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {clients.map((client) => (
                    <div
                      key={client.id}
                      className={`p-6 rounded-2xl card ${
                        isDarkMode 
                          ? 'bg-gray-800/40 border border-gray-700/50 hover:border-blue-500/50'
                          : 'bg-white/60 border border-gray-300/50 hover:border-blue-500/50'
                      } transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/20`}
                    >
                      {editingClient === client.id ? (
                        <div className="space-y-3">
                          <input
                            type="text"
                            defaultValue={client.nom}
                            onBlur={(e) => modifierClient(client.id, 'nom', e.target.value)}
                            className={`w-full px-3 py-2 rounded-lg ${
                              isDarkMode ? 'bg-gray-700/50 text-white' : 'bg-white text-gray-900'
                            } border border-gray-600`}
                          />
                          <input
                            type="text"
                            defaultValue={client.groupe}
                            onBlur={(e) => modifierClient(client.id, 'groupe', e.target.value)}
                            className={`w-full px-3 py-2 rounded-lg ${
                              isDarkMode ? 'bg-gray-700/50 text-white' : 'bg-white text-gray-900'
                            } border border-gray-600`}
                          />
                          <input
                            type="text"
                            defaultValue={client.business}
                            onBlur={(e) => modifierClient(client.id, 'business', e.target.value)}
                            className={`w-full px-3 py-2 rounded-lg ${
                              isDarkMode ? 'bg-gray-700/50 text-white' : 'bg-white text-gray-900'
                            } border border-gray-600`}
                          />
                          <button
                            onClick={() => setEditingClient(null)}
                            className="w-full py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                          >
                            Valider
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <h4 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                {client.nom}
                              </h4>
                              <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold mt-2 ${
                                isDarkMode ? 'bg-purple-600/30 text-purple-300' : 'bg-purple-200 text-purple-700'
                              }`}>
                                {client.groupe}
                              </span>
                            </div>
                            <Users className={`w-6 h-6 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                          </div>
                          
                          <div className={`mb-4 p-3 rounded-lg ${isDarkMode ? 'bg-gray-700/30' : 'bg-gray-50'}`}>
                            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mb-1`}>
                              Type de business:
                            </p>
                            <p className={`font-semibold ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                              {client.business}
                            </p>
                          </div>

                          <div className="flex gap-2">
                            <button
                              onClick={() => setEditingClient(client.id)}
                              className="flex-1 py-2 bg-blue-600/80 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                            >
                              Modifier
                            </button>
                            <button
                              onClick={() => supprimerClient(client.id)}
                              className="flex-1 py-2 bg-red-600/80 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                            >
                              Supprimer
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>

                <div className={`p-6 rounded-2xl card backdrop-blur-md ${
                  isDarkMode 
                    ? 'bg-gradient-to-br from-blue-900/30 to-purple-900/30 border border-blue-500/30'
                    : 'bg-gradient-to-br from-blue-100 to-purple-100 border border-blue-300'
                }`}>
                  <h3 className={`text-xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    Total des clients actifs
                  </h3>
                  <p className={`text-3xl font-bold ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                    {clients.length} clients
                  </p>
                </div>
              </div>
            )}

          </div>
        </main>
      </div>

      {/* Footer avec informations */}
      <footer className={`mt-8 py-4 backdrop-blur-md ${
        isDarkMode ? 'bg-gray-800/50 border-t border-gray-700/50' : 'bg-white/50 border-t border-gray-300/50'
      }`}>
        <div className="container mx-auto px-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              GTA RP Manager - Version Démo • Sauvegarde automatique activée
            </p>
            <div className="flex items-center gap-4">
              <span className={`flex items-center gap-2 text-sm ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                En ligne
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default GTARPManager;