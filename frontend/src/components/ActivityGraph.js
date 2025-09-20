import React from 'react';

const ActivityGraph = ({ data }) => {
    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + (6 - today.getDay())); // Конец текущей недели (суббота)

    const startDate = new Date(endDate);
    startDate.setDate(endDate.getDate() - 364); // 52 недели * 7 дней - 1

    const dates = [];
    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
        dates.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
    }

    const dataMap = new Map();
    data.forEach(item => {
        const date = new Date(item.date).toDateString();
        dataMap.set(date, item.count);
    });

    const getColor = (count) => {
        if (count > 8) return 'bg-brand-purple';
        if (count > 5) return 'bg-purple-700';
        if (count > 2) return 'bg-purple-800';
        if (count > 0) return 'bg-gray-700';
        return 'bg-gray-800';
    };

    return (
        <div className="bg-dark-card p-4 rounded-lg">
            <h3 className="font-bold mb-4 text-lg">Активность за год</h3>
            <div className="grid grid-flow-col grid-rows-7 gap-1">
                {dates.map((date, index) => {
                    const count = dataMap.get(date.toDateString()) || 0;
                    const color = getColor(count);
                    return (
                        <div key={index} className="relative group">
                            <div className={`w-3 h-3 rounded-sm ${color}`}></div>
                            <div className="absolute bottom-full mb-2 w-max px-2 py-1 bg-gray-900 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                {count} просмотров {date.toLocaleDateString()}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default ActivityGraph;
