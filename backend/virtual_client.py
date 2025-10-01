import time
import random
import requests
from database import SessionLocal
from models import SimulationResult


def run_simulation():
    print("シミュレーション開始...")

    for scenario_id in [1, 2, 3]:
        print(f"\nシナリオ {scenario_id} の処理を開始")

        for replication in range(1, 4):
            print(f"  レプリケーション {replication} を実行中...")

            total_labor_costs = random.uniform(8000, 12000)
            ontime_delivery_rate = random.uniform(0.75, 0.95)

            db = SessionLocal()
            try:
                result = SimulationResult(
                    scenario_id=scenario_id,
                    replication=replication,
                    total_labor_costs=total_labor_costs,
                    ontime_delivery_rate=ontime_delivery_rate
                )
                db.add(result)
                db.commit()
                print(f"    → DB書き込み成功（コスト: {total_labor_costs:.2f}, 納期率: {ontime_delivery_rate:.2%}）")
            except Exception as e:
                db.rollback()
                print(f"    × DB書き込みエラー: {e}")
            finally:
                db.close()

            time.sleep(2)
            print(f"  レプリケーション {replication} 完了")

    print("\n全シミュレーション完了！完了通知を送信します...")

    try:
        response = requests.post("http://localhost:8000/api/notify-completion")
        if response.status_code == 200:
            print("完了通知の送信に成功しました")
        else:
            print(f"完了通知の送信に失敗しました（ステータスコード: {response.status_code}）")
    except Exception as e:
        print(f"完了通知の送信中にエラーが発生しました: {e}")


if __name__ == "__main__":
    run_simulation()