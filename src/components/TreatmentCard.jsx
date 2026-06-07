import React from 'react';

const TreatmentCard = ({ icon: Icon, title, items, description }) => {

  return (
    <div className="card-base group hover-shadow-extra transform hover:-translate-y-2 hover:border-emerald-200 transition-all duration-500 ease-out">
      <div className="card-header">
        <div className="card-icon-wrapper group-hover:bg-emerald-600 group-hover:text-white">
          <Icon size={24} />
        </div>
        <h3 className="card-title">{title}</h3>
      </div>
      
      {description && (
        <p className="card-description">
          {description}
        </p>
      )}
      
      <div className="mt-auto">
        <ul className="space-y-2.5">
          {items.map((item, idx) => (
            <li key={idx} className="card-list-item">
              <div className="card-bullet" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default TreatmentCard;