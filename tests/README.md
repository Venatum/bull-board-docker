# Job Generator Script

Ce script JavaScript génère des jobs Bull & BullMQ de différents types avec un préfixe en option pour les tests.

## Utilisation

```bash
node tests/job-generator.js [options]
```

## Options

| Option | Description | Valeur par défaut | Exemples |
|--------|-------------|-------------------|----------|
| `--version <bull\|bullmq>` | Spécifie la version de Bull à utiliser | `bullmq` | `--version bull` |
| `--prefix <string>` | Préfixe pour les queues | `bull` | `--prefix myapp` |
| `--queue <string>` | Nom de la queue | `test-queue` | `--queue email-queue` |
| `--count <number>` | Nombre de jobs à générer | `5` | `--count 10` |
| `--type <string>` | Type de job à créer | `default` | `--type delayed` |
| `--all` | Crée des jobs de tous les types (ignore --type) | - | `--all --count 3` |
| `--help` | Affiche l'aide | - | `--help` |

## Types de jobs disponibles

- **default** : Jobs standards sans options particulières
- **delayed** : Jobs avec délai d'exécution (5 secondes par job)
- **repeated** : Jobs répétés (toutes les 30 secondes, limité à 3 répétitions)
- **priority** : Jobs avec priorité aléatoire (1-10)
- **failed** : Jobs conçus pour échouer (pour tester la gestion d'erreurs)

## Exemples d'utilisation

### Génération basique
```bash
# Génère 5 jobs normaux avec BullMQ
node tests/job-generator.js
```

### Utilisation avec Bull classique
```bash
# Génère 10 jobs avec Bull classique et un préfixe personnalisé
node tests/job-generator.js --version bull --prefix myapp --count 10
```

### Jobs avec délai
```bash
# Génère 3 jobs avec délai
node tests/job-generator.js --type delayed --count 3
```

### Jobs avec priorité
```bash
# Génère 5 jobs avec priorité dans une queue spécifique
node tests/job-generator.js --queue email-queue --type priority --count 5
```

### Jobs répétés
```bash
# Génère des jobs répétés avec BullMQ
node tests/job-generator.js --type repeated --count 2
```

### Jobs qui échouent
```bash
# Génère des jobs conçus pour échouer (utile pour tester la gestion d'erreurs)
node tests/job-generator.js --type failed --count 3
```

### Génération de tous les types
```bash
# Génère 3 jobs de chaque type (15 jobs au total)
node tests/job-generator.js --all --count 3
```

## Configuration

Le script utilise la configuration Redis définie dans `src/config.js`. Assurez-vous que :

1. Redis est en cours d'exécution
2. Les variables d'environnement sont correctement configurées dans `.env`
3. Les dépendances sont installées (`npm install`)

## Structure des jobs générés

Chaque job contient les données suivantes :

```javascript
{
  id: 1,                                    // ID séquentiel du job
  message: "Test job 1 of type default",    // Message descriptif
  timestamp: "2025-07-31T13:52:00.000Z",   // Timestamp de création
  type: "default"                           // Type de job
}
```

## Intégration avec Bull Board

Les jobs générés apparaîtront automatiquement dans l'interface Bull Board si elle est configurée pour surveiller les mêmes queues avec le même préfixe.

## Dépannage

### Erreur de connexion Redis
```
Redis Client Error: connect ECONNREFUSED 127.0.0.1:6379
```
- Vérifiez que Redis est démarré
- Vérifiez la configuration dans `.env`

### Jobs non visibles dans Bull Board
- Vérifiez que le préfixe utilisé correspond à celui configuré dans Bull Board
- Vérifiez que la queue existe et est surveillée par Bull Board

### Erreur de module
```
Cannot find module 'bullmq'
```
- Exécutez `npm install` pour installer les dépendances
