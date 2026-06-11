# -*- coding: utf-8 -*-
import os
from datetime import datetime

print("=" * 60)
print("COLETOR - SOMENTE CODE MERC (Filtrado)")
print("=" * 60)

# CAMINHO BASE - agora apontando para myapp
caminho_base = r"C:\Users\nicolas.sampaio\Desktop\AppChecklist\code merc\myapp"
caminho_src = os.path.join(caminho_base, "src")

print(f"\n📁 Coletando de: {caminho_base}")
print("📋 Filtro: pasta 'src' inteira + arquivos da raiz (App.js, app.json, package.json)\n")

if not os.path.exists(caminho_base):
    print(f"❌ ERRO: Pasta 'myapp' não encontrada!")
    print(f"\nVerifique se o caminho está correto:")
    print(f"  {caminho_base}")
    input("\nPressione ENTER para sair...")
    exit()

# Conjunto de arquivos específicos na raiz do myapp
arquivos_raiz = {'App.js', 'app.json', 'package.json'}

print("🔍 Procurando arquivos...")

arquivos = []

# 1. Primeiro, pegar os arquivos específicos da raiz do myapp
print("  ✓ Buscando arquivos da raiz (App.js, app.json, package.json)...")
for arquivo in arquivos_raiz:
    caminho_arquivo = os.path.join(caminho_base, arquivo)
    if os.path.isfile(caminho_arquivo):
        arquivos.append(caminho_arquivo)
        print(f"    - Encontrado: {arquivo}")
    else:
        print(f"    - Não encontrado: {arquivo}")

# 2. Depois, pegar TODO o conteúdo da pasta src
print("\n  ✓ Buscando pasta 'src' completa...")
if os.path.exists(caminho_src):
    for raiz, dirs, files in os.walk(caminho_src):
        if 'node_modules' in raiz:
            continue
        for file in files:
            if file.endswith(('.js', '.jsx', '.ts', '.tsx', '.json', '.html', '.css')):
                caminho_completo = os.path.join(raiz, file)
                arquivos.append(caminho_completo)
    
    print(f"    - Pasta src encontrada, coletando arquivos...")
else:
    print(f"    - ⚠️ Pasta src NÃO encontrada em: {caminho_src}")

print(f"\n📊 Total de arquivos encontrados: {len(arquivos)}")

if len(arquivos) == 0:
    print("\n⚠️ Nenhum arquivo encontrado!")
    print("\nVerifique se:")
    print(f"  1. A pasta existe: {caminho_base}")
    print(f"  2. Os arquivos App.js, app.json, package.json existem na raiz")
    print(f"  3. A pasta src existe: {caminho_src}")
    input("\nPressione ENTER para sair...")
    exit()

# Criar arquivo de saída
timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
saida = f"code_merc_filtrado_{timestamp}.txt"

print(f"\n📝 Gerando arquivo: {saida}\n")

with open(saida, 'w', encoding='utf-8') as f:
    f.write(f"CODE MERC - CÓDIGO FONTE (FILTRADO)\n")
    f.write(f"Origem: {caminho_base}\n")
    f.write(f"Filtro: Pasta 'src' completa + arquivos (App.js, app.json, package.json)\n")
    f.write(f"Total: {len(arquivos)} arquivos\n")
    f.write(f"Data: {datetime.now()}\n")
    f.write("=" * 70 + "\n\n")
    
    for i, arquivo in enumerate(arquivos, 1):
        rel = os.path.relpath(arquivo, caminho_base)
        f.write(f"\n{'=' * 70}\n")
        f.write(f"ARQUIVO {i}: {rel}\n")
        f.write(f"{'=' * 70}\n\n")
        
        try:
            with open(arquivo, 'r', encoding='utf-8') as codigo:
                conteudo = codigo.read()
                if conteudo.strip():
                    f.write(conteudo)
                    f.write("\n")
                else:
                    f.write("[ARQUIVO VAZIO]\n")
            print(f"✓ {i}/{len(arquivos)} - {rel[:60]}")
        except Exception as e:
            f.write(f"[ERRO AO LER: {str(e)}]\n")
            print(f"✗ {i}/{len(arquivos)} - {rel[:60]}")

print(f"\n✅ CONCLUÍDO!")
print(f"📄 Arquivo: {saida}")
print(f"📊 Total: {len(arquivos)} arquivos coletados")
print(f"\n📋 Resumo do que foi coletado:")
print(f"   • Arquivos da raiz do myapp: App.js, app.json, package.json")
print(f"   • Pasta 'src' completa (todos os arquivos dentro dela)")

input("\nPressione ENTER para fechar...")