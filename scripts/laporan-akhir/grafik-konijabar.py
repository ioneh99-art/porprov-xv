# Grafik untuk Laporan Akhir PORPROV XV — versi KONI Jabar (netral). Membaca data-konijabar.json → grafik-kj/*.png
import json, os
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

D = json.load(open('data-konijabar.json'))
OUT = 'grafik-kj'; os.makedirs(OUT, exist_ok=True)
EMAS, PERAK, PERUNGGU = '#C9A227', '#9AA3AD', '#B5733A'
UTAMA, LAIN = '#1F4E79', '#C9D3DE'
plt.rcParams.update({'font.family': 'Arial', 'font.size': 9, 'axes.spines.top': False, 'axes.spines.right': False,
                     'axes.titleweight': 'bold', 'axes.titlesize': 11, 'axes.titlelocation': 'left'})
def simpan(fig, nama): fig.tight_layout(); fig.savefig(f'{OUT}/{nama}.png', dpi=200); plt.close(fig)
K = D['klasemen']

# k1 klasemen 27
fig, ax = plt.subplots(figsize=(7, 7.2))
nm = [k['nama'] for k in K][::-1]; e = [k['emas'] for k in K][::-1]; p = [k['perak'] for k in K][::-1]; g = [k['perunggu'] for k in K][::-1]
ax.barh(nm, e, color=EMAS, label='Emas'); ax.barh(nm, p, left=e, color=PERAK, label='Perak'); ax.barh(nm, g, left=[a + b for a, b in zip(e, p)], color=PERUNGGU, label='Perunggu')
for i, k in enumerate(K[::-1]): ax.text(k['total'] + 4, i, f"{k['emas']}/{k['perak']}/{k['perunggu']}", va='center', fontsize=7)
ax.set_xlim(0, max(k['total'] for k in K) * 1.16); ax.legend(frameon=False, loc='lower right'); ax.set_title('Klasemen akhir PORPROV XV — 27 kontingen')
simpan(fig, 'k1_klasemen')

# k2 efisiensi scatter
fig, ax = plt.subplots(figsize=(7, 3.8))
for k in K:
    ax.scatter(k['atlet'], k['emas'], s=34, color=UTAMA if k['peringkat'] <= 5 else LAIN, edgecolor='#555', zorder=3)
    if k['peringkat'] <= 9 or k['emas'] >= 20: ax.annotate(k['nama'], (k['atlet'], k['emas']), xytext=(5, 3), textcoords='offset points', fontsize=7.5)
ax.set_xlabel('Atlet dikirim (resmi)'); ax.set_ylabel('Emas'); ax.set_title('Atlet yang dikirim vs emas yang diraih')
simpan(fig, 'k2_efisiensi')

# k3 medali per 100 atlet
S = sorted(K, key=lambda k: -(k['medaliPer100Atlet'] or 0))
fig, ax = plt.subplots(figsize=(7, 6))
ax.barh([k['nama'] for k in S][::-1], [k['medaliPer100Atlet'] or 0 for k in S][::-1], color=[UTAMA if k['peringkat'] <= 5 else '#7F9CB8' for k in S][::-1])
for i, k in enumerate(S[::-1]): ax.text((k['medaliPer100Atlet'] or 0) + 0.6, i, f"{k['medaliPer100Atlet']}", va='center', fontsize=7)
ax.set_title('Medali per 100 atlet yang dikirim (biru tua = 5 besar klasemen)'); simpan(fig, 'k3_efisiensi_bar')

# k4 konsentrasi emas
e5 = sum(k['emas'] for k in K[:5]); e10 = sum(k['emas'] for k in K[5:10]); erest = sum(k['emas'] for k in K[10:])
fig, ax = plt.subplots(figsize=(7, 1.6))
tot = e5 + e10 + erest; kiri = 0
for n, lbl, w in [(e5, '5 besar', UTAMA), (e10, 'Peringkat 6–10', '#7F9CB8'), (erest, '17 kontingen lain', LAIN)]:
    ax.barh([0], [n], left=kiri, color=w); ax.text(kiri + n/2, 0, f"{lbl}\n{n} emas ({round(n/tot*100)}%)", ha='center', va='center', fontsize=8, color='white' if w != LAIN else 'black'); kiri += n
ax.set_xlim(0, tot); ax.axis('off'); ax.set_title(f'Sebaran {tot} emas'); simpan(fig, 'k4_konsentrasi')

# k5 beban hari
H = D['bahan']['hari']; lb = [x['tanggal'][8:10] + '/' + x['tanggal'][5:7] for x in H]
fig, ax = plt.subplots(figsize=(7, 2.6))
ax.bar(lb, [x['laga'] for x in H], color='#7F9CB8', label='Laga/partai'); ax.plot(lb, [x['perebutanMedali'] for x in H], color=EMAS, marker='o', ms=3, label='Perebutan medali')
ax.tick_params(axis='x', rotation=90, labelsize=7); ax.legend(frameon=False); ax.set_title('Beban pertandingan per hari'); simpan(fig, 'k5_beban_hari')

# k6 nomor sepi per cabor
sp = sorted(D['bahan']['sepiPerCabor'].items(), key=lambda x: -x[1])
fig, ax = plt.subplots(figsize=(7, 3.2))
ax.barh([c for c, _ in sp][::-1], [n for _, n in sp][::-1], color='#B5733A')
for i, (_, n) in enumerate(sp[::-1]): ax.text(n + 0.2, i, str(n), va='center', fontsize=8)
ax.set_title('Nomor dengan ≤ 3 peserta, per cabor'); simpan(fig, 'k6_sepi_cabor')

# k7 peta kekuatan: 10 besar × 18 cabor dengan emas terbanyak
C = [c for c in D['cabor'] if c['emas'] > 0][:18]
import numpy as np
peta = D.get('peta10')
if peta:
    mat = [[peta[str(k['situsId'])].get(str(c['situsId']), 0) for c in C] for k in K[:10]]
    fig, ax = plt.subplots(figsize=(7, 4))
    arr = np.array(mat, dtype=float); im = ax.imshow(arr, cmap='YlOrBr', aspect='auto')
    ax.set_xticks(range(len(C))); ax.set_xticklabels([c['nama'] for c in C], rotation=70, ha='right', fontsize=7)
    ax.set_yticks(range(10)); ax.set_yticklabels([k['nama'] for k in K[:10]], fontsize=8)
    for i in range(10):
        for j in range(len(C)):
            if arr[i, j]: ax.text(j, i, int(arr[i, j]), ha='center', va='center', fontsize=6.5, color='black' if arr[i, j] < arr.max() * 0.6 else 'white')
    ax.spines[:].set_visible(False); ax.set_title('Peta kekuatan: emas 10 besar di 18 cabor dengan emas terbanyak')
    simpan(fig, 'k7_peta')
print('ok', sorted(os.listdir(OUT)))
