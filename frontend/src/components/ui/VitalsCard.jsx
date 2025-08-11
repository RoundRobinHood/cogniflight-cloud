import React from "react";
import {Card, CardHeader, CardBody} from "./Card";

function VitalsCard({ label, value, unit, alert }) {
  //determining which CSS to use: eg."if alert =true - display .alert-card"
  const cardClass = alert ? "vitals-card alert-card" : "vitals-card";
  return (
    <Card className={cardClass}>
      <CardHeader title={label}/>
      <CardBody>
      <p className="vitals-value">
        {value}
        {unit}
      </p>
      {alert && <p className="alert">{alert}</p>}
      </CardBody>
    </Card>
  );
}

export default VitalsCard;
