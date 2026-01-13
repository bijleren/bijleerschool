import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import {
  HardDrive,
  TrendingUp,
  FileImage,
  BookOpen,
  FolderOpen,
  Mail,
  Clock,
  AlertCircle,
  CheckCircle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Download,
} from 'lucide-react';
import {
  getSchoolStorageUsage,
  getStorageBreakdown,
  getRecentUploads,
  formatBytes,
  getFileTypeLabel,
} from '../../utils/storageTracking';

interface StorageData {
  usedBytes: number;
  limitBytes: number;
  usedGB: number;
  limitGB: number;
  percentageUsed: number;
  isPremium: boolean;
}

interface StorageBreakdown {
  fileType: string;
  totalSizeBytes: number;
  totalSizeGB: number;
  fileCount: number;
}

interface RecentUpload {
  id: string;
  fileType: string;
  filePath: string;
  fileSizeBytes: number;
  fileSizeMB: number;
  uploadedBy: string;
  uploadedAt: string;
}

type SortField = 'fileType' | 'totalSize' | 'fileCount';
type SortDirection = 'asc' | 'desc';

export function DataGebruikTab() {
  const { user } = useAuth();
  const [storageData, setStorageData] = useState<StorageData | null>(null);
  const [breakdown, setBreakdown] = useState<StorageBreakdown[]>([]);
  const [recentUploads, setRecentUploads] = useState<RecentUpload[]>([]);
  const [loading, setLoading] = useState(true);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('totalSize');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  useEffect(() => {
    if (user) {
      loadSchoolId();
    }
  }, [user]);

  useEffect(() => {
    if (schoolId) {
      loadStorageData();
    }
  }, [schoolId]);

  const loadSchoolId = async () => {
    if (!user) return;

    const { data: userSchools } = await supabase
      .from('user_schools')
      .select('school_id')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle();

    if (userSchools) {
      setSchoolId(userSchools.school_id);
    }
  };

  const loadStorageData = async () => {
    if (!schoolId) return;

    setLoading(true);
    try {
      const [usage, breakdownData, uploads] = await Promise.all([
        getSchoolStorageUsage(schoolId),
        getStorageBreakdown(schoolId),
        getRecentUploads(schoolId, 20),
      ]);

      setStorageData(usage);
      setBreakdown(breakdownData);
      setRecentUploads(uploads);
    } catch (error) {
      console.error('Error loading storage data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStorageStatus = () => {
    if (!storageData) return 'unknown';
    if (storageData.percentageUsed >= 90) return 'critical';
    if (storageData.percentageUsed >= 75) return 'warning';
    return 'ok';
  };

  const getStorageColor = () => {
    const status = getStorageStatus();
    switch (status) {
      case 'critical':
        return 'bg-red-500';
      case 'warning':
        return 'bg-orange-500';
      default:
        return 'bg-green-500';
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedBreakdown = [...breakdown].sort((a, b) => {
    let comparison = 0;

    switch (sortField) {
      case 'fileType':
        comparison = getFileTypeLabel(a.fileType as any).localeCompare(
          getFileTypeLabel(b.fileType as any)
        );
        break;
      case 'totalSize':
        comparison = a.totalSizeBytes - b.totalSizeBytes;
        break;
      case 'fileCount':
        comparison = a.fileCount - b.fileCount;
        break;
    }

    return sortDirection === 'asc' ? comparison : -comparison;
  });

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-4 h-4 text-gray-400" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="w-4 h-4 text-blue-600" />
    ) : (
      <ArrowDown className="w-4 h-4 text-blue-600" />
    );
  };

  const getFileTypeIcon = (fileType: string) => {
    switch (fileType) {
      case 'student_photo':
        return <FileImage className="w-5 h-5" />;
      case 'book_cover':
        return <BookOpen className="w-5 h-5" />;
      case 'school_material':
        return <FolderOpen className="w-5 h-5" />;
      case 'newsletter_attachment':
        return <Mail className="w-5 h-5" />;
      default:
        return <HardDrive className="w-5 h-5" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!storageData) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Geen opslaggegevens beschikbaar
        </h3>
        <p className="text-gray-600">Kon opslaggegevens niet laden</p>
      </div>
    );
  }

  const status = getStorageStatus();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Data-gebruik</h1>
        <p className="text-gray-600 mt-1">Beheer en monitor uw opslaggebruik</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Opslaggebruik</h3>
              <p className="text-sm text-gray-600 mt-1">
                {storageData.usedGB} GB van {storageData.limitGB} GB gebruikt
              </p>
            </div>
            <div
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                status === 'critical'
                  ? 'bg-red-100 text-red-800'
                  : status === 'warning'
                  ? 'bg-orange-100 text-orange-800'
                  : 'bg-green-100 text-green-800'
              }`}
            >
              {storageData.percentageUsed}% gebruikt
            </div>
          </div>

          <div className="relative pt-1">
            <div className="overflow-hidden h-4 mb-4 text-xs flex rounded-full bg-gray-200">
              <div
                style={{ width: `${Math.min(storageData.percentageUsed, 100)}%` }}
                className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${getStorageColor()} transition-all duration-500`}
              ></div>
            </div>
          </div>

          {status === 'critical' && (
            <div className="flex items-start gap-3 p-4 bg-red-50 rounded-lg border border-red-200">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-red-900">Opslaglimiet bijna bereikt</h4>
                <p className="text-sm text-red-700 mt-1">
                  U heeft bijna uw opslaglimiet bereikt. Upgrade naar een premium account
                  voor meer opslagruimte.
                </p>
              </div>
            </div>
          )}

          {status === 'warning' && (
            <div className="flex items-start gap-3 p-4 bg-orange-50 rounded-lg border border-orange-200">
              <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-orange-900">Opslagruimte wordt schaars</h4>
                <p className="text-sm text-orange-700 mt-1">
                  Overweeg om oude bestanden te verwijderen of upgrade naar premium voor meer
                  ruimte.
                </p>
              </div>
            </div>
          )}
        </Card>

        <Card>
          <div className="flex items-center gap-3 mb-4">
            <div className={`p-3 ${storageData.isPremium ? 'bg-yellow-50' : 'bg-blue-50'} rounded-lg`}>
              <HardDrive className={`w-6 h-6 ${storageData.isPremium ? 'text-yellow-600' : 'text-blue-600'}`} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Account Type</h3>
              <p className="text-sm text-gray-600">
                {storageData.isPremium ? 'Premium' : 'Gratis'}
              </p>
            </div>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Opslaglimiet:</span>
              <span className="font-medium text-gray-900">{storageData.limitGB} GB</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Gebruikt:</span>
              <span className="font-medium text-gray-900">{storageData.usedGB} GB</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Beschikbaar:</span>
              <span className="font-medium text-gray-900">
                {(storageData.limitGB - storageData.usedGB).toFixed(2)} GB
              </span>
            </div>
          </div>

          {!storageData.isPremium && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <Button variant="primary" className="w-full">
                <TrendingUp className="w-4 h-4 mr-2" />
                Upgrade naar Premium
              </Button>
            </div>
          )}
        </Card>
      </div>

      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Opslagverdeling per type</h3>

        {sortedBreakdown.length === 0 ? (
          <div className="text-center py-8">
            <HardDrive className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Nog geen bestanden geüpload</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort('fileType')}
                  >
                    <div className="flex items-center gap-2">
                      Bestandstype
                      <SortIcon field="fileType" />
                    </div>
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort('totalSize')}
                  >
                    <div className="flex items-center gap-2">
                      Totale grootte
                      <SortIcon field="totalSize" />
                    </div>
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort('fileCount')}
                  >
                    <div className="flex items-center gap-2">
                      Aantal bestanden
                      <SortIcon field="fileCount" />
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Percentage
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedBreakdown.map((item) => {
                  const percentage = (item.totalSizeBytes / storageData.usedBytes) * 100;
                  return (
                    <tr key={item.fileType} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-50 rounded-lg">
                            {getFileTypeIcon(item.fileType)}
                          </div>
                          <span className="text-sm font-medium text-gray-900">
                            {getFileTypeLabel(item.fileType as any)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatBytes(item.totalSizeBytes)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.fileCount}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-[100px]">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                          <span className="text-sm text-gray-600 w-12">
                            {percentage.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Recente uploads</h3>
          <Button variant="secondary" size="sm" onClick={loadStorageData}>
            <Clock className="w-4 h-4 mr-2" />
            Vernieuwen
          </Button>
        </div>

        {recentUploads.length === 0 ? (
          <div className="text-center py-8">
            <Clock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Geen recente uploads</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentUploads.slice(0, 10).map((upload) => (
              <div
                key={upload.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className="p-2 bg-white rounded-lg shadow-sm">
                    {getFileTypeIcon(upload.fileType)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {getFileTypeLabel(upload.fileType as any)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {upload.uploadedBy} • {new Date(upload.uploadedAt).toLocaleDateString('nl-NL')}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{upload.fileSizeMB} MB</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
