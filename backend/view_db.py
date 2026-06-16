import sqlite3

def dump_table(cursor, table_name):
    print(f"\n=== Table: {table_name} ===")
    try:
        cursor.execute(f"SELECT * FROM {table_name}")
        rows = cursor.fetchall()
        
        # Get column names
        cursor.execute(f"PRAGMA table_info({table_name})")
        columns = [col[1] for col in cursor.fetchall()]
        
        if not rows:
            print("No data found.")
            return
            
        # Format and print
        header = " | ".join(columns)
        print(header)
        print("-" * len(header))
        for row in rows:
            print(" | ".join(str(val) for val in row))
    except sqlite3.OperationalError as e:
        print(f"Error querying table {table_name}: {e}")

def main():
    import os
    base_dir = os.path.dirname(os.path.abspath(__file__))
    db_path = os.path.join(base_dir, "database.db")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Get all tables
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = [t[0] for t in cursor.fetchall() if not t[0].startswith("sqlite_")]
    
    if not tables:
        print("No tables found in database.db.")
    else:
        for table in tables:
            dump_table(cursor, table)
            
    conn.close()

if __name__ == "__main__":
    main()
