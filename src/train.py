import pandas as pd
import os
from sklearn.model_selection import train_test_split
from sklearn.svm import SVC
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
import joblib

DATA_PATH = "data"
MODEL_PATH = "models/model.pkl"

# ── Load CSVs ─────────────────────────────────
if not os.path.exists(DATA_PATH):
    print("❌ 'data/' folder not found"); exit()

files = [f for f in os.listdir(DATA_PATH) if f.endswith(".csv")]
if not files:
    print("❌ No CSV files found in data/"); exit()

df = pd.concat(
    [pd.read_csv(os.path.join(DATA_PATH, f)) for f in files],
    ignore_index=True
).sample(frac=1, random_state=42).reset_index(drop=True)

print(f"📦 Loaded {len(df)} samples | {df['label'].nunique()} classes: {sorted(df['label'].unique())}")

# ── Features & Labels ─────────────────────────
X = df.drop("label", axis=1).values
y = df["label"].values

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

# ── Train & Compare ───────────────────────────
candidates = {
    "SVM": Pipeline([
        ("scaler", StandardScaler()),
        ("clf", SVC(kernel="rbf", C=10, gamma="scale", probability=True))
    ]),
    "Random Forest": RandomForestClassifier(
        n_estimators=200, random_state=42, n_jobs=-1
    ),
}

print("\n🔍 Evaluating models...\n")
best_name, best_model, best_acc = None, None, 0.0

for name, model in candidates.items():
    model.fit(X_train, y_train)
    acc = model.score(X_test, y_test)
    print(f"  {name:<18} → Test accuracy: {acc:.2%}")
    if acc > best_acc:
        best_name, best_model, best_acc = name, model, acc

# ── Save Best ─────────────────────────────────
os.makedirs("models", exist_ok=True)
joblib.dump(best_model, MODEL_PATH)

print(f"\n✅ Best model : {best_name} ({best_acc:.2%})")
print(f"✅ Saved      : {MODEL_PATH}")