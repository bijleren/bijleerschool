import React from 'react';
import { Card } from '../ui/Card';
import { Settings, Shield, Bell, Database } from 'lucide-react';

export function SettingsTab() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Instellingen</h1>
        <p className="text-gray-600">Beheer je account en applicatie-instellingen</p>
      </div>

      <div className="space-y-6">
        {/* Account Settings */}
        <Card>
          <div className="flex items-start space-x-4">
            <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-indigo-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Account beveiliging</h3>
              <p className="text-gray-600 mb-4">
                Beheer je wachtwoord en beveiligingsinstellingen
              </p>
              <div className="text-sm text-gray-500">
                <p>• Wachtwoord wijzigen via je profiel</p>
                <p>• Twee-factor authenticatie (binnenkort beschikbaar)</p>
                <p>• Inlogsessies beheren (binnenkort beschikbaar)</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Notifications */}
        <Card>
          <div className="flex items-start space-x-4">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Bell className="w-5 h-5 text-green-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Meldingen</h3>
              <p className="text-gray-600 mb-4">
                Configureer hoe en wanneer je meldingen ontvangt
              </p>
              <div className="text-sm text-gray-500">
                <p>• E-mail meldingen (binnenkort beschikbaar)</p>
                <p>• Push meldingen (binnenkort beschikbaar)</p>
                <p>• Activiteiten updates (binnenkort beschikbaar)</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Data Management */}
        <Card>
          <div className="flex items-start space-x-4">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Database className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Gegevensbeheer</h3>
              <p className="text-gray-600 mb-4">
                Beheer je gegevens en privacy-instellingen
              </p>
              <div className="text-sm text-gray-500">
                <p>• Gegevens exporteren (binnenkort beschikbaar)</p>
                <p>• Account verwijderen (binnenkort beschikbaar)</p>
                <p>• Privacy-instellingen (binnenkort beschikbaar)</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Application Info */}
        <Card>
          <div className="flex items-start space-x-4">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              <Settings className="w-5 h-5 text-gray-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Applicatie informatie</h3>
              <div className="text-sm text-gray-600 space-y-1">
                <p><span className="font-medium">Versie:</span> 1.0.0 (Beta)</p>
                <p><span className="font-medium">Laatste update:</span> {new Date().toLocaleDateString('nl-NL')}</p>
                <p><span className="font-medium">Status:</span> <span className="text-green-600">Operationeel</span></p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}