from database import SessionLocal
from models import Scenario

def init_scenarios():
    db = SessionLocal()
    try:
        existing = db.query(Scenario).count()
        if existing > 0:
            print(f"シナリオデータは既に存在します（{existing}件）")
            return

        scenarios = [
            Scenario(scenario_id=1, scenario_name="現状維持シナリオ", description="現在の人員配置と残業時間を維持した場合のシミュレーション"),
            Scenario(scenario_id=2, scenario_name="人員1名追加シナリオ", description="作業者を1名追加した場合のシミュレーション"),
            Scenario(scenario_id=3, scenario_name="残業1時間追加シナリオ", description="1日あたりの残業時間を1時間増やした場合のシミュレーション"),
        ]

        for scenario in scenarios:
            db.add(scenario)

        db.commit()
        print("シナリオデータを3件投入しました")
    except Exception as e:
        db.rollback()
        print(f"エラーが発生しました: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    init_scenarios()