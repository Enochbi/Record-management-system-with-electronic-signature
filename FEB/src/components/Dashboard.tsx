import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import { Fiche } from '../types';
import { 
  FileText, 
  Plus,
  Clock,
  CheckCircle,
  AlertCircle,
  Users,
  TrendingUp,
  Eye
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [fiches, setFiches] = useState<Fiche[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    brouillon: 0,
    enAttente: 0,
    valide: 0,
  });

  useEffect(() => {
    fetchFiches();
  }, []);

  const fetchFiches = async () => {
    try {
      const response = await api.get('/api/fiches');
      const fichesData = response.data.data;
      setFiches(fichesData);
      
      // Calculate stats
      const stats = {
        total: fichesData.length,
        brouillon: fichesData.filter((f: Fiche) => f.status === 'Brouillon').length,
        enAttente: fichesData.filter((f: Fiche) => f.status === 'En_Attente').length,
        valide: fichesData.filter((f: Fiche) => f.status === 'Valide').length,
      };
      setStats(stats);
    } catch (error) {
      console.error('Error fetching fiches:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'Brouillon': { color: 'bg-gray-100 text-gray-800', icon: Clock },
      'En_Attente': { color: 'bg-yellow-100 text-yellow-800', icon: AlertCircle },
      'Signe': { color: 'bg-blue-100 text-blue-800', icon: Users },
      'Valide': { color: 'bg-green-100 text-green-800', icon: CheckCircle },
    };

    const config = statusConfig[status as keyof typeof statusConfig];
    const Icon = config?.icon || Clock;

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config?.color}`}>
        <Icon className="w-3 h-3 mr-1" />
        {status.replace('_', ' ')}
      </span>
    );
  };

  const recentFiches = fiches.slice(0, 5);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Bonjour, {user?.fullName}
            </h1>
            <p className="text-gray-600 mt-1">
              Bienvenue dans votre espace de gestion des fiches matériel
            </p>
          </div>
          <Link
            to="/fiche/nouvelle"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nouvelle fiche
          </Link>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <FileText className="h-8 w-8 text-indigo-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Total des fiches
                </dt>
                <dd className="text-lg font-medium text-gray-900">
                  {stats.total}
                </dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Clock className="h-8 w-8 text-gray-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Brouillons
                </dt>
                <dd className="text-lg font-medium text-gray-900">
                  {stats.brouillon}
                </dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <AlertCircle className="h-8 w-8 text-yellow-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  En attente
                </dt>
                <dd className="text-lg font-medium text-gray-900">
                  {stats.enAttente}
                </dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Validées
                </dt>
                <dd className="text-lg font-medium text-gray-900">
                  {stats.valide}
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Fiches */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">
              Fiches récentes
            </h3>
            <Link
              to="/historique"
              className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
            >
              Voir tout
            </Link>
          </div>
        </div>

        <div className="overflow-hidden">
          {recentFiches.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                Aucune fiche
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Commencez par créer votre première fiche matériel.
              </p>
              <div className="mt-6">
                <Link
                  to="/fiche/nouvelle"
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Nouvelle fiche
                </Link>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {recentFiches.map((fiche) => (
                <div key={fiche.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3">
                        <span className="text-sm font-medium text-gray-900">
                          Fiche #{fiche.id}
                        </span>
                        {getStatusBadge(fiche.status)}
                      </div>
                      <div className="mt-1">
                        <p className="text-sm text-gray-600">
                          Client: {fiche.client} • Département: {fiche.departement}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Créée le {format(new Date(fiche.dateCreation), 'dd MMMM yyyy', { locale: fr })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Link
                        to={`/fiche/${fiche.id}`}
                        className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        Voir
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;