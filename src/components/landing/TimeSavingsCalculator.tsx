import React, { useState, useMemo } from 'react';
import { Clock, TrendingUp, Zap, BookOpen, CheckCircle, Users, GraduationCap } from 'lucide-react';

const APP_SAVINGS = [
  {
    id: 'webwijzer',
    name: 'WebWijzer',
    color: 'bg-orange-500',
    lightColor: 'bg-orange-100',
    textColor: 'text-orange-700',
    borderColor: 'border-orange-200',
    minutesPerWeek: 20,
    learningBenefit: 'Leerlingen vinden sneller de juiste bronnen',
    description: 'Geen tijd meer verliezen aan links dicteren of foutieve websites',
  },
  {
    id: 'activitijd',
    name: 'ActiviTijd',
    color: 'bg-teal-500',
    lightColor: 'bg-teal-100',
    textColor: 'text-teal-700',
    borderColor: 'border-teal-200',
    minutesPerWeek: 30,
    learningBenefit: 'Meer zelfstandig werken door leerlingen',
    description: 'Minder herhalingsvragen over wat leerlingen moeten doen',
  },
  {
    id: 'boeker',
    name: 'Boeker',
    color: 'bg-pink-500',
    lightColor: 'bg-pink-100',
    textColor: 'text-pink-700',
    borderColor: 'border-pink-200',
    minutesPerWeek: 25,
    learningBenefit: 'Leesbewustzijn stijgt door digitaal bijhouden',
    description: 'Manuele uitleenregistratie en zoeken in kaartenbak verdwijnt',
  },
  {
    id: 'gedrag',
    name: 'Gedragsmanagement',
    color: 'bg-green-500',
    lightColor: 'bg-green-100',
    textColor: 'text-green-700',
    borderColor: 'border-green-200',
    minutesPerWeek: 40,
    learningBenefit: 'Betere inzichten leiden tot gerichte aanpak',
    description: 'Papieren incidentrapporten en zoeken in dossiers verdwijnt',
  },
  {
    id: 'leescoach',
    name: 'Leescoach',
    color: 'bg-rose-500',
    lightColor: 'bg-rose-100',
    textColor: 'text-rose-700',
    borderColor: 'border-rose-200',
    minutesPerWeek: 35,
    learningBenefit: 'Gerichte leesinterventies op basis van data',
    description: 'Geen manuele notities meer nodig na leessessies',
  },
  {
    id: 'sporen',
    name: 'Sporen',
    color: 'bg-[#946B29]',
    lightColor: 'bg-brand-tint',
    textColor: 'text-brand',
    borderColor: 'border-brand-soft/40',
    minutesPerWeek: 30,
    learningBenefit: 'Differentiatie wordt inzichtelijk en beheersbaar',
    description: 'Overzicht van leertrajecten altijd beschikbaar, geen losse notities',
  },
  {
    id: 'schooldag',
    name: 'Schooldag Planner',
    color: 'bg-slate-500',
    lightColor: 'bg-slate-100',
    textColor: 'text-slate-700',
    borderColor: 'border-slate-200',
    minutesPerWeek: 25,
    learningBenefit: 'Helder dagritme vermindert stress bij leerlingen',
    description: 'Planningen hoeven niet langer opnieuw gemaakt te worden',
  },
];

const SCHOOL_WEEKS_PER_YEAR = 36;
const FAMILIARITY_BONUS_PERCENT = 0.25;

function formatTime(totalMinutes: number): { value: string; unit: string } {
  if (totalMinutes < 60) return { value: String(Math.round(totalMinutes)), unit: 'min' };
  const hours = totalMinutes / 60;
  if (hours < 100) return { value: hours.toFixed(1).replace('.0', ''), unit: 'uur' };
  return { value: Math.round(hours).toLocaleString('nl-BE'), unit: 'uur' };
}

export function TimeSavingsCalculator() {
  const [selected, setSelected] = useState<Set<string>>(new Set(['webwijzer', 'activitijd', 'leescoach']));
  const [classes, setClasses] = useState(4);

  const toggleApp = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const { weeklyMinutes, yearlyMinutes, schoolMinutes, familiarityMinutes, totalMinutes, classBreakdown } = useMemo(() => {
    const activeApps = APP_SAVINGS.filter((a) => selected.has(a.id));
    const weekly = activeApps.reduce((sum, a) => sum + a.minutesPerWeek, 0);
    const yearly = weekly * SCHOOL_WEEKS_PER_YEAR;
    const school = yearly * classes;
    const familiarity = school * FAMILIARITY_BONUS_PERCENT * (classes > 1 ? 1 : 0);
    const total = school + familiarity;
    const breakdown = Array.from({ length: classes }, (_, i) => {
      const base = yearly * (i + 1);
      const fam = i > 0 ? base * FAMILIARITY_BONUS_PERCENT : 0;
      return { classNum: i + 1, base, fam, total: base + fam };
    });
    return {
      weeklyMinutes: weekly,
      yearlyMinutes: yearly,
      schoolMinutes: school,
      familiarityMinutes: familiarity,
      totalMinutes: total,
      classBreakdown: breakdown,
    };
  }, [selected, classes]);

  const weeklyFmt = formatTime(weeklyMinutes);
  const yearlyFmt = formatTime(yearlyMinutes);
  const totalFmt = formatTime(totalMinutes);
  const maxTotal = classBreakdown.length > 0 ? classBreakdown[classBreakdown.length - 1].total : 1;

  return (
    <div className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="max-w-2xl mx-auto text-center mb-14">
          <span className="inline-block bg-brand-tint text-brand text-sm font-semibold px-4 py-1.5 rounded-full mb-5 border border-brand-soft/40">
            Leer- &amp; tijdswinst
          </span>
          <h2 className="text-3xl font-heading font-bold text-ink mb-4">
            Elke klas die bijleer.school gebruikt, versterkt de volgende.
          </h2>
          <p className="text-gray-500 text-lg leading-relaxed">
            Tijdswinst stapelt op: meer klassen betekent meer gewonnen uren voor het hele team. En omdat leerlingen de tools al kennen als ze doorstromen, wint elke nieuwe leerkracht er ook meteen bij.
          </p>
        </div>

        <div className="grid lg:grid-cols-5 gap-8 items-start">
          {/* Left: app selector */}
          <div className="lg:col-span-2 space-y-3">
            <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Selecteer jouw apps</p>
            {APP_SAVINGS.map((app) => {
              const active = selected.has(app.id);
              return (
                <button
                  key={app.id}
                  onClick={() => toggleApp(app.id)}
                  className={`w-full text-left rounded-xl border-2 px-4 py-3.5 transition-all duration-150 ${
                    active
                      ? `${app.borderColor} ${app.lightColor}`
                      : 'border-gray-200 bg-white hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`text-sm font-semibold ${active ? app.textColor : 'text-gray-700'}`}>
                          {app.name}
                        </span>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${active ? `${app.lightColor} ${app.textColor}` : 'bg-gray-100 text-gray-500'}`}>
                          ~{app.minutesPerWeek} min/week
                        </span>
                      </div>
                      {active && (
                        <p className="text-xs text-gray-500 leading-snug mt-1">{app.description}</p>
                      )}
                    </div>
                    <div className={`flex-shrink-0 w-5 h-5 rounded-full border-2 mt-0.5 flex items-center justify-center transition-colors ${
                      active ? `${app.color} border-transparent` : 'border-gray-300'
                    }`}>
                      {active && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Right: results */}
          <div className="lg:col-span-3 space-y-6">
            {/* Stat cards */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { icon: <Zap className="w-5 h-5 text-brand" />, bg: 'bg-brand-tint', label: 'Per week', fmt: weeklyFmt },
                { icon: <Clock className="w-5 h-5 text-emerald-600" />, bg: 'bg-emerald-50', label: 'Per schooljaar', fmt: yearlyFmt },
                { icon: <TrendingUp className="w-5 h-5 text-orange-600" />, bg: 'bg-orange-50', label: `Over ${classes} ${classes === 1 ? 'klas' : 'klassen'}`, fmt: totalFmt },
              ].map((s) => (
                <div key={s.label} className="bg-white rounded-2xl border border-gray-200 p-5 text-center">
                  <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl ${s.bg} mb-3`}>
                    {s.icon}
                  </div>
                  <div className="text-2xl font-bold text-gray-900 leading-none">
                    {selected.size === 0 ? '—' : s.fmt.value}
                    <span className="text-sm font-medium text-gray-400 ml-1">{selected.size > 0 ? s.fmt.unit : ''}</span>
                  </div>
                  <div className="text-xs text-gray-400 mt-1">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Classes slider */}
            <div className="bg-gray-50 rounded-2xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-semibold text-gray-700">Aantal klassen op school</span>
                </div>
                <span className="text-sm font-bold text-brand">{classes} {classes === 1 ? 'klas' : 'klassen'}</span>
              </div>
              <p className="text-xs text-gray-400 mb-4">Elke extra klas die de tools gebruikt, bespaart extra tijd voor het hele team.</p>
              <input
                type="range"
                min={1}
                max={20}
                value={classes}
                onChange={(e) => setClasses(Number(e.target.value))}
                className="w-full h-2 bg-brand-soft/40 rounded-full appearance-none cursor-pointer accent-brand"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-2">
                <span>1 klas</span>
                <span>10 klassen</span>
                <span>20 klassen</span>
              </div>
            </div>

            {/* Familiarity bonus callout */}
            {classes > 1 && selected.size > 0 && (
              <div className="bg-amber-50 rounded-2xl border border-amber-200 p-5 flex gap-4">
                <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center mt-0.5">
                  <GraduationCap className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-amber-800 mb-1">Doorstroombonusvoor de volgende leerkracht</p>
                  <p className="text-xs text-amber-700 leading-relaxed">
                    Leerlingen die de tools al kennen van vorig jaar, vragen minder instructietijd in de nieuwe klas.
                    Dat levert een extra besparing op van{' '}
                    <span className="font-bold">{formatTime(familiarityMinutes).value} {formatTime(familiarityMinutes).unit}</span>{' '}
                    (+{Math.round(FAMILIARITY_BONUS_PERCENT * 100)}% bonus) voor de {classes - 1} overige {classes - 1 === 1 ? 'klas' : 'klassen'} die de leerlingen doorstromen naar.
                  </p>
                </div>
              </div>
            )}

            {/* Bar chart */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <div className="flex items-center gap-2 mb-5">
                <TrendingUp className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-semibold text-gray-700">Cumulatieve tijdswinst per klas</span>
                {classes > 1 && selected.size > 0 && (
                  <div className="ml-auto flex items-center gap-3 text-xs">
                    <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-sm bg-brand-soft"></span> Basiswinst</span>
                    <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-sm bg-amber-400"></span> Doorstroombonus</span>
                  </div>
                )}
              </div>
              {selected.size === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                  <BookOpen className="w-8 h-8 mb-2 opacity-40" />
                  <span className="text-sm">Selecteer apps om de tijdswinst te berekenen</span>
                </div>
              ) : (
                <div className="space-y-3">
                  {classBreakdown.map((item) => {
                    const basePct = maxTotal > 0 ? (item.base / maxTotal) * 100 : 0;
                    const famPct = maxTotal > 0 ? (item.fam / maxTotal) * 100 : 0;
                    const baseFmt = formatTime(item.base);
                    const totalItemFmt = formatTime(item.total);
                    return (
                      <div key={item.classNum} className="flex items-center gap-3">
                        <span className="text-xs font-medium text-gray-500 w-14 flex-shrink-0">
                          {item.classNum} {item.classNum === 1 ? 'klas' : 'klassen'}
                        </span>
                        <div className="flex-1 flex h-6 rounded-full overflow-hidden bg-gray-100">
                          <div
                            className="h-full bg-gradient-to-r from-[#946B29] to-brand-soft flex items-center justify-end transition-all duration-500"
                            style={{ width: `${Math.max(basePct, 4)}%` }}
                          />
                          {item.fam > 0 && (
                            <div
                              className="h-full bg-gradient-to-r from-amber-400 to-amber-300 transition-all duration-500"
                              style={{ width: `${Math.max(famPct, 0)}%` }}
                            />
                          )}
                          <div className="flex items-center pl-2 pr-3 ml-auto">
                            <span className="text-xs font-bold text-gray-600 whitespace-nowrap">
                              {item.fam > 0 ? `${totalItemFmt.value} ${totalItemFmt.unit}` : `${baseFmt.value} ${baseFmt.unit}`}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Learning benefits */}
            {selected.size > 0 && (
              <div className="bg-emerald-50 rounded-2xl border border-emerald-100 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <BookOpen className="w-4 h-4 text-emerald-600" />
                  <span className="text-sm font-semibold text-emerald-800">Leerwinst per geselecteerde app</span>
                </div>
                <ul className="space-y-2">
                  {APP_SAVINGS.filter((a) => selected.has(a.id)).map((a) => (
                    <li key={a.id} className="flex items-start gap-2.5">
                      <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="text-sm font-semibold text-emerald-800">{a.name}: </span>
                        <span className="text-sm text-emerald-700">{a.learningBenefit}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
