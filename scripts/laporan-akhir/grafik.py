# Grafik untuk Laporan Akhir PORPROV XV — versi Kab. Bandung. Membaca data.json, menulis g*.png.
import json, os, collections
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

D = json.load(open('data.json'))
OUT = 'grafik'; os.makedirs(OUT, exist_ok=True)
EMAS, PERAK, PERUNGGU = '#C9A227', '#9AA3AD', '#B5733A'
KITA, LAIN, MERAH, HIJAU = '#1F4E79', '#C9D3DE', '#C0392B', '#2E8B57'
plt.rcParams.update({'font.family': 'Arial', 'font.size': 9, 'axes.spines.top': False, 'axes.spines.right': False,
                     'axes.titleweight': 'bold', 'axes.titlesize': 11, 'axes.titlelocation': 'left'})

def simpan(fig, nama):
    fig.tight_layout(); fig.savefig(f'{OUT}/{nama}.png', dpi=200); plt.close(fig)

# 1. Tangga target vs realisasi
fig, ax = plt.subplots(figsize=(7, 3.2))
lab = ['Target Cabor\n(File B)', 'Target KONI\n(File B)', 'Proyeksi PPT\n(Okt)', 'Target KONI\nrasionalisasi', 'Realisasi\nresmi']
nil = [D['fileB']['totalTargetCabor'], D['fileB']['totalTargetKoni'], len(D['proyeksi74']), D['target54Total'], D['kb']['emas']]
warna = [LAIN, LAIN, LAIN, '#7F9CB8', KITA]
b = ax.bar(lab, nil, color=warna, width=0.6)
for r, v in zip(b, nil): ax.text(r.get_x() + r.get_width()/2, v + 2, str(v), ha='center', fontweight='bold')
ax.set_ylabel('Emas'); ax.set_title('Target emas Kab. Bandung dari waktu ke waktu vs hasil')
ax.set_ylim(0, max(nil) * 1.15); simpan(fig, 'g1_tangga_target')

# 2. Target 54 per cabor vs realisasi
t = sorted(D['target54'], key=lambda x: (-x['emas'], -x['realisasi']))
fig, ax = plt.subplots(figsize=(7, 6.6))
y = range(len(t))[::-1]
ax.barh([i + 0.2 for i in y], [x['emas'] for x in t], height=0.4, color=LAIN, label='Target KONI')
ax.barh([i - 0.2 for i in y], [x['realisasi'] for x in t], height=0.4, color=[HIJAU if x['realisasi'] >= x['emas'] else MERAH for x in t], label='Realisasi emas')
ax.set_yticks(list(y)); ax.set_yticklabels([x['cabor'] for x in t])
for i, x in zip(y, t): ax.text(max(x['emas'], x['realisasi']) + 0.15, i, f"{x['realisasi']}/{x['emas']}", va='center', fontsize=8)
ax.set_xlabel('Emas'); ax.set_title('Target KONI 54 emas per cabor vs realisasi'); ax.legend(loc='lower right', frameon=False)
simpan(fig, 'g2_target54_cabor')

# 3. Nasib 74 proyeksi
c = collections.Counter(p['hasil'] for p in D['proyeksi74'])
urut = [('emas', 'Emas', EMAS), ('perak', 'Perak', PERAK), ('perunggu', 'Perunggu', PERUNGGU), ('tanpa medali', 'Tanpa medali', '#7F8C8D'), ('tidak ada hasil tercatat', 'Tak terlacak', '#D5DBDB')]
fig, ax = plt.subplots(figsize=(7, 1.9))
kiri = 0
for k, lbl, w in urut:
    n = c.get(k, 0)
    if not n: continue
    ax.barh([0], [n], left=kiri, color=w, label=f'{lbl} ({n})')
    ax.text(kiri + n/2, 0, str(n), ha='center', va='center', fontsize=10, fontweight='bold', color='white' if k in ('emas', 'perunggu', 'tanpa medali') else 'black')
    kiri += n
ax.set_xlim(0, kiri); ax.axis('off'); ax.set_title('Hasil 74 target emas di PPT proyeksi')
ax.legend(ncol=5, frameon=False, loc='upper center', bbox_to_anchor=(0.5, -0.05), fontsize=8)
simpan(fig, 'g3_proyeksi74')

# 4. Emas Kab. Bandung per hari
h = sorted((k, v) for k, v in D['emasHari'].items() if k != '?')
fig, ax = plt.subplots(figsize=(7, 2.6))
lbl = [k[8:10] + '/' + k[5:7] for k, _ in h]
b = ax.bar(lbl, [v for _, v in h], color=EMAS)
for r, (_, v) in zip(b, h): ax.text(r.get_x() + r.get_width()/2, v + 0.2, str(v), ha='center', fontsize=8)
ax.set_title('Emas Kab. Bandung per hari'); ax.set_ylabel('Emas'); simpan(fig, 'g4_emas_hari')

# 5. Klasemen 10 besar
k10 = D['klasemen'][:10]
fig, ax = plt.subplots(figsize=(7, 3.4))
nama = [x['nama'] for x in k10][::-1]
e = [x['emas'] for x in k10][::-1]; p = [x['perak'] for x in k10][::-1]; g = [x['perunggu'] for x in k10][::-1]
ax.barh(nama, e, color=EMAS, label='Emas'); ax.barh(nama, p, left=e, color=PERAK, label='Perak')
ax.barh(nama, g, left=[a + b for a, b in zip(e, p)], color=PERUNGGU, label='Perunggu')
for i, x in enumerate(k10[::-1]): ax.text(x['total'] + 5, i, f"{x['emas']}/{x['perak']}/{x['perunggu']}", va='center', fontsize=8, fontweight='bold' if x['kontingenId'] == 4 else 'normal')
for lab_ in ax.get_yticklabels():
    if lab_.get_text() == 'Kab. Bandung': lab_.set_fontweight('bold'); lab_.set_color(KITA)
ax.set_title('Klasemen akhir — 10 besar'); ax.legend(frameon=False, loc='lower right'); ax.set_xlim(0, max(x['total'] for x in k10) * 1.18)
simpan(fig, 'g5_klasemen')

# 6. Efisiensi: atlet vs emas
fig, ax = plt.subplots(figsize=(7, 3.8))
for x in D['klasemen']:
    kita = x['kontingenId'] == 4
    ax.scatter(x['atlet'], x['emas'], s=60 if kita else 30, color=KITA if kita else LAIN, edgecolor='#555' if not kita else KITA, zorder=3 if kita else 2)
    if kita or x['peringkat'] <= 5 or x['emas'] >= 30: ax.annotate(x['nama'], (x['atlet'], x['emas']), xytext=(5, 3), textcoords='offset points', fontsize=8, fontweight='bold' if kita else 'normal', color=KITA if kita else '#333')
ax.set_xlabel('Atlet dikirim (resmi)'); ax.set_ylabel('Emas'); ax.set_title('Atlet yang dikirim vs emas yang diraih (27 kontingen)')
simpan(fig, 'g6_efisiensi')

# 7. Rekor tanding vs 8 lawan tersering
L = D['persaingan']['lawan'][:10]
fig, ax = plt.subplots(figsize=(7, 3.4))
nm = [x['lawan'] for x in L][::-1]
ax.barh(nm, [x['menang'] for x in L][::-1], color=HIJAU, label='Menang')
ax.barh(nm, [-x['kalah'] for x in L][::-1], color=MERAH, label='Kalah')
for i, x in enumerate(L[::-1]): ax.text(x['menang'] + 1, i, f"{round(x['persen']*100)}%", va='center', fontsize=8)
ax.axvline(0, color='#333', lw=0.8); ax.set_xlabel('← kalah   |   menang →')
ax.set_title('Rekor laga tanding Kab. Bandung vs 10 lawan tersering'); ax.legend(frameon=False, loc='lower right')
simpan(fig, 'g7_persaingan')

# 8. Umur
urutU = ['≤17', '18–20', '21–23', '24–29', '30–35', '≥36']
U = D['umurRingkas']
fig, ax = plt.subplots(figsize=(7, 2.8))
xs = range(len(urutU))
ax.bar([i - 0.27 for i in xs], [U.get(k, {}).get('atlet', 0) for k in urutU], width=0.27, color=LAIN, label='Atlet resmi')
ax.bar(list(xs), [U.get(k, {}).get('bermedali', 0) for k in urutU], width=0.27, color=KITA, label='Bermedali')
ax.bar([i + 0.27 for i in xs], [U.get(k, {}).get('emas', 0) for k in urutU], width=0.27, color=EMAS, label='Peraih emas')
ax.set_xticks(list(xs)); ax.set_xticklabels([k + ' th' for k in urutU]); ax.legend(frameon=False)
ax.set_title('Atlet Kab. Bandung menurut umur (per 20 Nov 2026)'); simpan(fig, 'g8_umur')

# 9. Beban laga per hari (seluruh PORPROV)
H = D['bahan']['hari']
fig, ax = plt.subplots(figsize=(7, 2.6))
ax.bar([x['tanggal'][8:10] + '/' + x['tanggal'][5:7] for x in H], [x['laga'] for x in H], color='#7F9CB8', label='Laga')
ax.plot([x['tanggal'][8:10] + '/' + x['tanggal'][5:7] for x in H], [x['perebutanMedali'] for x in H], color=EMAS, marker='o', ms=3, label='Perebutan medali')
ax.tick_params(axis='x', rotation=90, labelsize=7); ax.legend(frameon=False); ax.set_title('Beban laga per hari — seluruh PORPROV XV')
simpan(fig, 'g9_beban_hari')

# 10. Medali per cabor Kab. Bandung (15 teratas)
cb = D['caborKB'][:15]
fig, ax = plt.subplots(figsize=(7, 4))
nm = [x['cabor'] for x in cb][::-1]
e = [x['emas'] for x in cb][::-1]; p = [x['perak'] for x in cb][::-1]; g = [x['perunggu'] for x in cb][::-1]
ax.barh(nm, e, color=EMAS, label='Emas'); ax.barh(nm, p, left=e, color=PERAK, label='Perak'); ax.barh(nm, g, left=[a + b for a, b in zip(e, p)], color=PERUNGGU, label='Perunggu')
ax.set_title('Medali Kab. Bandung per cabor — 15 teratas'); ax.legend(frameon=False, loc='lower right')
simpan(fig, 'g10_cabor_kb')
print('ok', sorted(os.listdir(OUT)))
